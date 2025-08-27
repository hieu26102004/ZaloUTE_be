import { Injectable } from '@nestjs/common';
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

  async handleSendMessage(socket: any, io: any, data: any) {
    try {
      let conversationId = data.conversationId;
      if (!conversationId && data.receiverId) {
        const conversation = await this.conversationService.findOrCreatePrivateConversation(
          new Types.ObjectId(socket.data.userId),
          new Types.ObjectId(data.receiverId)
        );
        conversationId = conversation._id;
      }
      const message = await this.messageService.createMessage(
        new Types.ObjectId(conversationId),
        new Types.ObjectId(socket.data.userId),
        data.content,
        data.type || 'text'
      );
      io.to(data.receiverId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, message);
      socket.emit(SOCKET_EVENTS.RECEIVE_MESSAGE, message);
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
