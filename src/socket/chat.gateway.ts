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
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

@WebSocketGateway({ 
  cors: { origin: '*' },
  namespace: '/chat'
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly messageSocketHandler: MessageSocketHandler,
    private readonly conversationSocketHandler: ConversationSocketHandler,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket Gateway initialized');
  }

  async handleConnection(socket: Socket) {
    try {
      const userId = (socket as any).data?.userId;
      if (userId) {
        this.connectedUsers.set(userId, socket.id);
        
        // Join user to their conversation rooms
        await this.conversationSocketHandler.joinUserConversations(socket, userId);
        
        // Notify others that user is online
        socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
        
        // Send connection success
        socket.emit(SOCKET_EVENTS.CONNECTION_SUCCESS, { 
          message: 'Connected successfully',
          userId 
        });
        
        this.logger.log(`User ${userId} connected`);
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Connection failed' });
    }
  }

  handleDisconnect(socket: Socket) {
    try {
      const userId = (socket as any).data?.userId;
      if (userId) {
        this.connectedUsers.delete(userId);
        
        // Notify others that user is offline
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
        
        this.logger.log(`User ${userId} disconnected`);
      }
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // Validate DTO
      const dto = plainToInstance(SendMessageDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.messageSocketHandler.handleSendMessage(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Send message error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Send message failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.GET_MESSAGES)
  async handleGetMessages(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.log(`GET_MESSAGES received data: ${JSON.stringify(data)}`);
      // Validate DTO
      const dto = plainToInstance(GetMessagesDto, data);
      const errors = await validate(dto, { skipMissingProperties: true });
      if (errors.length > 0) {
        this.logger.error(`GET_MESSAGES validation errors: ${JSON.stringify(errors)}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.messageSocketHandler.handleGetMessages(socket, dto);
    } catch (error) {
      this.logger.error('Get messages error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get messages failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.GET_CONVERSATIONS)
  async handleGetConversations(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.log(`GET_CONVERSATIONS received data: ${JSON.stringify(data)}`);
      // For GET_CONVERSATIONS, we don't need strict validation since it's just optional pagination
      // If data is provided, validate it, otherwise use defaults
      const dto = plainToInstance(GetConversationsDto, data || {});
      const errors = await validate(dto, { skipMissingProperties: true });
      if (errors.length > 0) {
        this.logger.error(`GET_CONVERSATIONS validation errors: ${JSON.stringify(errors)}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.conversationSocketHandler.handleGetConversations(socket);
    } catch (error) {
      this.logger.error('Get conversations error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get conversations failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_CONVERSATION)
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      await this.conversationSocketHandler.handleJoinConversation(socket, data.conversationId);
    } catch (error) {
      this.logger.error('Join conversation error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Join conversation failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      await this.conversationSocketHandler.handleLeaveConversation(socket, data.conversationId);
    } catch (error) {
      this.logger.error('Leave conversation error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Leave conversation failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_START)
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const userId = (socket as any).data?.userId;
      socket.to(`conversation_${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_START, {
        userId,
        conversationId: data.conversationId
      });
    } catch (error) {
      this.logger.error('Typing start error:', error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_STOP)
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const userId = (socket as any).data?.userId;
      socket.to(`conversation_${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
        userId,
        conversationId: data.conversationId
      });
    } catch (error) {
      this.logger.error('Typing stop error:', error);
    }
  }

  // Helper method to get connected user socket
  getUserSocket(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
