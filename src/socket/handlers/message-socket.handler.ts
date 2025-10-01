

import { Injectable, Logger } from '@nestjs/common';
import { MessageService } from '../../shared/services/message.service';
import { ConversationService } from '../../shared/services/conversation.service';
import { SOCKET_EVENTS } from '../constants';
import { Types } from 'mongoose';

@Injectable()
export class MessageSocketHandler {
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

      // Populate sender information
      const populatedMessage = await this.messageService.getMessageById(new Types.ObjectId((message as any)._id.toString()));

      // Broadcast message to all participants in the conversation room
      const roomName = `${conversationId}`;
      io.to(roomName).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, populatedMessage);

      
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Send message failed', error: err.message });
    }
  }

  async handleGetMessages(socket: any, data: any) {
    try {
      const messages = await this.messageService.getMessages(
        new Types.ObjectId(data.conversationId),
        data.limit || 20,
        data.skip || 0
      );
      socket.emit(SOCKET_EVENTS.GET_MESSAGES_RESULT, messages);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get messages failed', error: err.message });
    }
  }
}
