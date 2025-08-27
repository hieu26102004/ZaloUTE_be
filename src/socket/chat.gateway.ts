import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageSocketHandler } from './handlers/message-socket.handler';
import { ConversationSocketHandler } from './handlers/conversation-socket.handler';
import { SOCKET_EVENTS } from './constants';
import { Types } from 'mongoose';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io: Server;

  constructor(
    private readonly messageSocketHandler: MessageSocketHandler,
    private readonly conversationSocketHandler: ConversationSocketHandler,
  ) {}

  afterInit(server: Server) {
    // Có thể setup middleware xác thực ở đây nếu cần
  }

  handleConnection(socket: Socket) {
    // Xử lý khi client kết nối
  }

  handleDisconnect(socket: Socket) {
    // Xử lý khi client disconnect
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    // Validate DTO
    const dto = plainToInstance(SendMessageDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
      return;
    }
    await this.messageSocketHandler.handleSendMessage(socket, this.io, dto);
  }

  @SubscribeMessage(SOCKET_EVENTS.GET_MESSAGES)
  async handleGetMessages(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    // Validate DTO
    const dto = plainToInstance(GetMessagesDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
      return;
    }
    await this.messageSocketHandler.handleGetMessages(socket, dto);
  }

  @SubscribeMessage(SOCKET_EVENTS.GET_CONVERSATIONS)
  async handleGetConversations(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    // Validate DTO (hiện tại không có field, nhưng để sẵn validate cho mở rộng)
    const dto = plainToInstance(GetConversationsDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
      return;
    }
    await this.conversationSocketHandler.handleGetConversations(socket);
  }
}
