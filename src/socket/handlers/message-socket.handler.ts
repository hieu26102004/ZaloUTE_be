

import { Injectable, Logger } from '@nestjs/common';
import { MessageService } from '../../shared/services/message.service';
import { ConversationService } from '../../shared/services/conversation.service';
import { SOCKET_EVENTS } from '../constants';
import { Types } from 'mongoose';

@Injectable()
export class MessageSocketHandler {
  private readonly logger = new Logger(MessageSocketHandler.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Returns the conversationId for a given messageId, or null if not found.
   */
  public async getConversationIdByMessageId(messageId: string): Promise<string | null> {
    try {
      const message = await this.messageService.getMessageById(new Types.ObjectId(messageId));
      if (message && message.conversation) {
        // conversation may be an ObjectId or string
        return message.conversation.toString();
      }
      return null;
    } catch (err) {
      this.logger.error('Failed to get conversationId by messageId:', err);
      return null;
    }
  }

  async handleSendMessage(socket: any, io: any, data: any) {
    try {
      let conversationId = data.conversationId;
      
      // If no conversationId but receiverId provided, find or create private conversation
      if (!conversationId && data.receiverId) {
        const conversation = await this.conversationService.findOrCreatePrivateConversation(
          new Types.ObjectId(socket.data.userId),
          new Types.ObjectId(data.receiverId)
        );
        conversationId = (conversation as any)._id.toString();
        
        // Join both users to the conversation room if not already joined
        const roomName = `${conversationId}`;
        socket.join(roomName);
        
        // Also join the receiver if they're connected
        const receiverSockets = await io.in(data.receiverId).fetchSockets();
        for (const receiverSocket of receiverSockets) {
          receiverSocket.join(roomName);
        }
      }

      // Create the message
      const message = await this.messageService.createMessage(
        new Types.ObjectId(conversationId),
        new Types.ObjectId(socket.data.userId),
        data.content,
        data.type || 'text'
      );

      // Check who is currently online in this conversation room
      const roomName = `${conversationId}`;
      const connectedSockets = await io.in(roomName).fetchSockets();
      const onlineUserIds = connectedSockets
        .map(s => s.data?.userId)
        .filter(id => id && id !== socket.data.userId); // Exclude sender

      // If there are online users in the conversation, mark message as read for them
      if (onlineUserIds.length > 0) {
        await this.messageService.markMessageAsReadForUsers(
          new Types.ObjectId((message as any)._id),
          onlineUserIds.map(id => new Types.ObjectId(id))
        );
      }

      // Update conversation's lastMessage
      await this.conversationService.updateLastMessage(
        new Types.ObjectId(conversationId),
        new Types.ObjectId((message as any)._id)
      );

      // Populate sender information
      const populatedMessage = await this.messageService.getMessageById(new Types.ObjectId((message as any)._id.toString()));

      // Broadcast message to all participants in the conversation room
      io.to(roomName).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, populatedMessage);

      // If the message is a call invite, also notify participants directly (per-user rooms)
      try {
        const CALL_INVITE_PREFIX = '[CALL_INVITE]';
        if (typeof (message as any).content === 'string' && (message as any).content.startsWith(CALL_INVITE_PREFIX)) {
          // Get conversation participants to notify
          const conversation = await this.conversationService.findConversationById(new Types.ObjectId(conversationId));
          const participantIds: string[] = (conversation?.participants || [])
            .map((p: any) => (typeof p === 'string' ? p : (p._id ? p._id.toString() : null)))
            .filter(Boolean)
            .filter((id: string) => id !== socket.data.userId); // exclude sender

          for (const pid of participantIds) {
            try {
              // Debug: check how many sockets are currently in the personal room for this user
              try {
                const socketsInPersonal = await io.in(pid).fetchSockets();
                const socketIds = (socketsInPersonal || []).map((s: any) => s.id);
                this.logger.debug(`Personal room ${pid} has ${socketIds.length} sockets: ${JSON.stringify(socketIds)}`);
                if (!socketIds.length) {
                  this.logger.warn(`No sockets found in personal room for user ${pid} when sending call-invite`);
                }
              } catch (e) {
                this.logger.debug(`Could not fetch sockets for personal room ${pid}: ${e}`);
              }

              // Emit a lightweight INCOMING_CALL event to the user's personal room so clients not in the conversation room get a fast notification
              io.in(pid).emit(SOCKET_EVENTS.INCOMING_CALL, {
                conversationId,
                message: populatedMessage,
              });
              // Also emit RECEIVE_MESSAGE as before to ensure message consistency for clients that handle messages
              io.in(pid).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, populatedMessage);
              this.logger.log(`Sent call-invite notification to user ${pid}`);
            } catch (e) {
              this.logger.warn(`Failed to send call invite to user ${pid}: ${e}`);
            }
          }
        }
      } catch (e) {
        this.logger.warn('Error while sending call invite notifications:', e);
      }

      this.logger.log(`Message sent to conversation ${conversationId} by user ${socket.data.userId}, online users: ${onlineUserIds.length}`);
      
    } catch (err) {
      this.logger.error('Send message failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Send message failed', error: err.message });
    }
  }

  async handleGetMessages(socket: any, data: any) {
    try {
      this.logger.log(`Getting messages for conversation: ${data.conversationId}`);
      
      const messages = await this.messageService.getMessages(
        new Types.ObjectId(data.conversationId),
        data.limit || 20,
        data.skip || 0
      );
      socket.emit(SOCKET_EVENTS.GET_MESSAGES_RESULT, messages);
    } catch (err) {
      this.logger.error('Get messages failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get messages failed', error: err.message });
    }
  }

  async handleMarkAsRead(socket: any, io: any, data: any) {
    try {
      const { conversationId } = data;
      const userId = new Types.ObjectId(socket.data.userId);
      
      this.logger.log(`Marking messages as read for conversation: ${conversationId} by user: ${userId}`);
      
      // Mark messages as read
      await this.messageService.markAsRead(new Types.ObjectId(conversationId), userId);
      
      // Broadcast to all participants that messages have been read
      const roomName = `${conversationId}`;
      io.to(roomName).emit(SOCKET_EVENTS.MESSAGES_READ, {
        conversationId,
        userId: userId.toString(),
        readAt: new Date().toISOString()
      });
      
      this.logger.log(`Messages marked as read for conversation ${conversationId}`);
      
    } catch (err) {
      this.logger.error('Mark as read failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Mark as read failed', error: err.message });
    }
  }
}
