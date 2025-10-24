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
import { GroupSocketHandler } from './handlers/group-socket.handler';
import { SOCKET_EVENTS } from './constants';
import { ReactionSocketHandler } from './handlers/reaction-socket.handler';
import { Types } from 'mongoose';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { 
  CreateGroupSocketDto, 
  UpdateGroupNameSocketDto, 
  AddGroupMemberSocketDto, 
  RemoveGroupMemberSocketDto, 
  LeaveGroupSocketDto, 
  TransferGroupAdminSocketDto,
  DissolveGroupSocketDto
} from './dto/group-socket.dto';
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
  // Map of userId -> set of socketIds (support multiple tabs/devices per user)
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly messageSocketHandler: MessageSocketHandler,
    private readonly conversationSocketHandler: ConversationSocketHandler,
    private readonly groupSocketHandler: GroupSocketHandler,
    private readonly reactionSocketHandler: ReactionSocketHandler,
  ) {}
  // Reaction: Add
  @SubscribeMessage(SOCKET_EVENTS.ADD_REACTION)
  async handleAddReaction(
    @MessageBody() data: { messageId: string; userId: string; type: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // Xử lý reaction
      await this.reactionSocketHandler.handleAddReaction(data);
      // Lấy reactions mới nhất cho message
      const reactions = await this.reactionSocketHandler.handleGetReactions(data.messageId);
      // Lấy conversationId từ message qua handler
      const conversationId = await this.messageSocketHandler.getConversationIdByMessageId(data.messageId);
      if (conversationId) {
        this.logger.log(`emit MESSAGE_REACTION_UPDATED to room ${conversationId} for message ${data.messageId}`);
        this.io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, {
          messageId: data.messageId,
          reactions,
          conversationId,
        });
      }
    } catch (error) {
      this.logger.error('Add reaction error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Add reaction failed' });
    }
  }

  // Reaction: Remove
  @SubscribeMessage(SOCKET_EVENTS.REMOVE_REACTION)
  async handleRemoveReaction(
    @MessageBody() data: { messageId: string; userId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      await this.reactionSocketHandler.handleRemoveReaction(data);
      // Lấy reactions mới nhất cho message
      const reactions = await this.reactionSocketHandler.handleGetReactions(data.messageId);
      // Lấy conversationId từ message qua handler
      const conversationId = await this.messageSocketHandler.getConversationIdByMessageId(data.messageId);
      if (conversationId) {
        this.logger.log(`emit MESSAGE_REACTION_UPDATED to room ${conversationId} for message ${data.messageId}`);
        this.io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, {
          messageId: data.messageId,
          reactions,
          conversationId,
        });
      }
    } catch (error) {
      this.logger.error('Remove reaction error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Remove reaction failed' });
    }
  }

  // Reaction: Get all
  @SubscribeMessage(SOCKET_EVENTS.GET_REACTIONS)
  async handleGetReactions(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const reactions = await this.reactionSocketHandler.handleGetReactions(data.messageId);
      socket.emit(SOCKET_EVENTS.REACTIONS_RESULT, { messageId: data.messageId, reactions });
    } catch (error) {
      this.logger.error('Get reactions error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Get reactions failed' });
    }
  }

  afterInit(server: Server) {
    this.logger.log('Socket Gateway initialized');
  }

  async handleConnection(socket: Socket) {
    try {
      // Debug: log handshake details observed by server
      try {
        const hs = (socket as any).handshake || {};
        // log query/auth objects and namespace name explicitly
        this.logger.debug(`Incoming socket handshake origin: ${hs.origin || hs.headers?.origin || ''}, url: ${hs.url || hs.pathname || ''}`);
        try {
          this.logger.debug(`Handshake query: ${JSON.stringify(hs.query || {})}`);
        } catch (e) {
          this.logger.debug('Handshake query: [unable to stringify]');
        }
        try {
          this.logger.debug(`Handshake auth: ${JSON.stringify(hs.auth || {})}`);
        } catch (e) {
          this.logger.debug('Handshake auth: [unable to stringify]');
        }
        try {
          this.logger.debug(`Socket namespace: ${socket.nsp?.name || '[unknown]'}`);
        } catch (e) {
          this.logger.debug('Socket namespace: [error]');
        }
      } catch (e) {
        // ignore
      }

      const userId = (socket as any).data?.userId;
      if (userId) {
        // add socket id to user's set
        const set = this.connectedUsers.get(userId) ?? new Set<string>();
        set.add(socket.id);
        this.connectedUsers.set(userId, set);

        // Ensure the socket joins a personal room named by userId so server can target the user directly
        try {
          socket.join(userId);
          this.logger.debug(`Socket ${socket.id} joined personal room ${userId}`);
        } catch (e) {
          this.logger.warn(`Failed to join personal room for user ${userId}: ${e}`);
        }

        // Join user to their conversation rooms
        await this.conversationSocketHandler.joinUserConversations(socket, userId);

        // If this is the first socket for user, notify others that user is online
        if (set.size === 1) {
          socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
        }

        // Send connection success to this socket
        socket.emit(SOCKET_EVENTS.CONNECTION_SUCCESS, {
          message: 'Connected successfully',
          userId,
        });

        this.logger.log(`User ${userId} connected (socket ${socket.id})`);
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
        const set = this.connectedUsers.get(userId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            this.connectedUsers.delete(userId);
            // Notify others that user is offline
            socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
          } else {
            // update map with remaining sockets
            this.connectedUsers.set(userId, set);
          }
        }

        this.logger.log(`User ${userId} disconnected (socket ${socket.id})`);
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

  @SubscribeMessage(SOCKET_EVENTS.MARK_AS_READ)
  async handleMarkAsRead(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.log(`MARK_AS_READ received data: ${JSON.stringify(data)}`);
      await this.messageSocketHandler.handleMarkAsRead(socket, this.io, data);
    } catch (error) {
      this.logger.error('Mark as read error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Mark as read failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.EDIT_MESSAGE)
  async handleEditMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // Validate DTO
      const dto = plainToInstance(EditMessageDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      
      this.logger.log(`EDIT_MESSAGE received data: ${JSON.stringify(data)}`);
      await this.messageSocketHandler.handleEditMessage(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Edit message error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Edit message failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.DELETE_MESSAGE)
  async handleDeleteMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // Validate DTO
      const dto = plainToInstance(DeleteMessageDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      
      this.logger.log(`DELETE_MESSAGE received data: ${JSON.stringify(data)}`);
      await this.messageSocketHandler.handleDeleteMessage(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Delete message error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Delete message failed' });
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
      socket.to(`${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_START, {
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
      socket.to(`${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
        userId,
        conversationId: data.conversationId
      });
    } catch (error) {
      this.logger.error('Typing stop error:', error);
    }
  }

  // --- WebRTC / Call signaling handlers ---
  @SubscribeMessage(SOCKET_EVENTS.CALL_JOIN)
  async handleCallJoin(
    @MessageBody() data: { room: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const room = data.room;
      socket.join(room);
      // Notify existing sockets in the room about the new join
      socket.to(room).emit(SOCKET_EVENTS.CALL_USER_JOINED, { socketId: socket.id });

      // Send existing members to the joining socket so it knows peers immediately
      const socketsInRoom = await this.io.in(room).allSockets(); // Set<string>
      for (const sid of socketsInRoom) {
        if (sid !== socket.id) {
          // send info about existing peer to the new socket
          socket.emit(SOCKET_EVENTS.CALL_USER_JOINED, { socketId: sid });
        }
      }

      this.logger.log(`Socket ${socket.id} joined call room ${room}`);
    } catch (error) {
      this.logger.error('Call join error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Call join failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL_OFFER)
  async handleCallOffer(
    @MessageBody() data: { target: string; offer: any },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.io.to(data.target).emit(SOCKET_EVENTS.CALL_OFFER, { from: socket.id, offer: data.offer });
    } catch (error) {
      this.logger.error('Call offer error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Call offer failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL_ANSWER)
  async handleCallAnswer(
    @MessageBody() data: { target: string; answer: any },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.io.to(data.target).emit(SOCKET_EVENTS.CALL_ANSWER, { from: socket.id, answer: data.answer });
    } catch (error) {
      this.logger.error('Call answer error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Call answer failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL_ICE_CANDIDATE)
  async handleCallIce(
    @MessageBody() data: { target: string; candidate: any },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.io.to(data.target).emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, { from: socket.id, candidate: data.candidate });
    } catch (error) {
      this.logger.error('Call ice candidate error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Call ice candidate failed' });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL_HANGUP)
  async handleCallHangup(
    @MessageBody() data: { room?: string; target?: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      if (data.room) {
        socket.to(data.room).emit(SOCKET_EVENTS.CALL_USER_LEFT, { socketId: socket.id, userId: (socket as any).data?.userId, username: (socket as any).data?.username });
        socket.leave(data.room);
      }
      if (data.target) {
        this.io.to(data.target).emit(SOCKET_EVENTS.CALL_USER_LEFT, { socketId: socket.id, userId: (socket as any).data?.userId, username: (socket as any).data?.username });
      }
    } catch (error) {
      this.logger.error('Call hangup error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Call hangup failed' });
    }
  }

  // Group management socket events
  @SubscribeMessage('create_group')
  async handleCreateGroup(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(CreateGroupSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleCreateGroup(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Create group socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Create group failed' });
    }
  }

  @SubscribeMessage('update_group_name')
  async handleUpdateGroupName(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(UpdateGroupNameSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleUpdateGroupName(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Update group name socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Update group name failed' });
    }
  }

  @SubscribeMessage('add_group_members')
  async handleAddGroupMembers(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(AddGroupMemberSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleAddGroupMembers(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Add group members socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Add group members failed' });
    }
  }

  @SubscribeMessage('remove_group_member')
  async handleRemoveGroupMember(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(RemoveGroupMemberSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleRemoveGroupMember(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Remove group member socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Remove group member failed' });
    }
  }

  @SubscribeMessage('leave_group')
  async handleLeaveGroup(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(LeaveGroupSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleLeaveGroup(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Leave group socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Leave group failed' });
    }
  }

  @SubscribeMessage('transfer_group_admin')
  async handleTransferGroupAdmin(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(TransferGroupAdminSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleTransferGroupAdmin(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Transfer group admin socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Transfer group admin failed' });
    }
  }

  @SubscribeMessage('dissolve_group')
  async handleDissolveGroup(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const dto = plainToInstance(DissolveGroupSocketDto, data);
      const errors = await validate(dto, { skipMissingProperties: false });
      if (errors.length > 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Validation failed', errors });
        return;
      }
      await this.groupSocketHandler.handleDissolveGroup(socket, this.io, dto);
    } catch (error) {
      this.logger.error('Dissolve group socket error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Dissolve group failed' });
    }
  }

  // Helper method to get connected user socket ids
  getUserSockets(userId: string): string[] {
    const set = this.connectedUsers.get(userId);
    return set ? Array.from(set) : [];
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && (this.connectedUsers.get(userId)?.size ?? 0) > 0;
  }
}
