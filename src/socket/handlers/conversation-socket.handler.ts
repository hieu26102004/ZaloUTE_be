import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from '../../shared/services/conversation.service';
import { SOCKET_EVENTS } from '../constants';
import { Types } from 'mongoose';

@Injectable()
export class ConversationSocketHandler {
  private readonly logger = new Logger(ConversationSocketHandler.name);

  constructor(private readonly conversationService: ConversationService) {}

  async handleGetConversations(socket: any) {
    try {
      const conversations = await this.conversationService.findUserConversations(new Types.ObjectId(socket.data.userId));
      socket.emit(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, conversations);
    } catch (err) {
      this.logger.error('Get conversations failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get conversations failed', error: err.message });
    }
  }

  async joinUserConversations(socket: any, userId: string) {
    try {
      const conversations = await this.conversationService.findUserConversations(new Types.ObjectId(userId));
      
      // Join socket to all user's conversation rooms
      for (const conversation of conversations) {
        const roomName = `conversation_${conversation._id}`;
        socket.join(roomName);
        this.logger.log(`User ${userId} joined room ${roomName}`);
      }
    } catch (err) {
      this.logger.error('Join user conversations failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Join conversations failed', error: err.message });
    }
  }

  async handleJoinConversation(socket: any, conversationId: string) {
    try {
      const roomName = `conversation_${conversationId}`;
      socket.join(roomName);
      this.logger.log(`User ${socket.data.userId} joined room ${roomName}`);
      
      socket.emit(SOCKET_EVENTS.CONNECTION_SUCCESS, { 
        message: `Joined conversation ${conversationId}`,
        conversationId 
      });
    } catch (err) {
      this.logger.error('Join conversation failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Join conversation failed', error: err.message });
    }
  }

  async handleLeaveConversation(socket: any, conversationId: string) {
    try {
      const roomName = `conversation_${conversationId}`;
      socket.leave(roomName);
      this.logger.log(`User ${socket.data.userId} left room ${roomName}`);
      
      socket.emit(SOCKET_EVENTS.CONNECTION_SUCCESS, { 
        message: `Left conversation ${conversationId}`,
        conversationId 
      });
    } catch (err) {
      this.logger.error('Leave conversation failed:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Leave conversation failed', error: err.message });
    }
  }
}
