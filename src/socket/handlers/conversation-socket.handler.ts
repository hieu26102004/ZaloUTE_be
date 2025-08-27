import { Injectable } from '@nestjs/common';
import { ConversationService } from '../../shared/services/conversation.service';
import { SOCKET_EVENTS } from '../constants';
import { Types } from 'mongoose';

@Injectable()
export class ConversationSocketHandler {
  constructor(private readonly conversationService: ConversationService) {}

  async handleGetConversations(socket: any) {
    try {
      const conversations = await this.conversationService.findUserConversations(new Types.ObjectId(socket.data.userId));
      socket.emit(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, conversations);
    } catch (err) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get conversations failed', error: err.message });
    }
  }
}
