import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { CallService } from '../application/services/call.service';
import { 
  WebRTCSignalDto, 
  JoinCallDto, 
  SignalType 
} from '../application/dto/webrtc-signal.dto';
import {
  InitiateCallDto,
  AcceptCallDto,
  RejectCallDto,
  EndCallDto,
} from '../application/dto/call-management.dto';
import { WsJwtGuard } from '../../socket/ws-jwt.guard';
import { CallStatus } from '../infrastructure/call.schema';
import { JwtService } from '../../shared/infrastructure/jwt.service';

@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: '*', // Allow all origins for testing
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
export class CallGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallGateway.name);

  constructor(
    private readonly callService: CallService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Call Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log('🔗 CallGateway: New client connecting, ID:', client.id);
    
    try {
      // Authenticate user manually
      const token = this.extractToken(client);
      
      if (!token) {
        console.log('❌ CallGateway: No token provided, socket:', client.id);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload) {
        console.log('❌ CallGateway: Invalid token, socket:', client.id);
        client.disconnect(true);
        return;
      }

      // Set user data
      (client as any).data = { 
        user: {
          userId: payload.sub, 
          email: payload.email,
          ...payload
        }
      };

      const userId = payload.sub;
      this.callService.registerUserSocket(userId, client.id);
      client.join(`user_${userId}`);
      console.log('✅ CallGateway: User', userId, 'connected with socket', client.id);
      console.log('🏠 CallGateway: User joined room:', `user_${userId}`);
      
    } catch (error) {
      console.log('❌ CallGateway: Auth error:', error.message, 'socket:', client.id);
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    try {
      // Lấy token từ query hoặc header
      if (client.handshake.query && client.handshake.query.token) {
        return String(client.handshake.query.token);
      }
      
      if (client.handshake.headers && client.handshake.headers.authorization) {
        const auth = client.handshake.headers.authorization;
        if (auth.startsWith('Bearer ')) {
          return auth.slice(7);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.userId;
    if (userId) {
      this.callService.unregisterUserSocket(userId);
    }
  }

  // Call Management Events
  @SubscribeMessage('call:initiate')
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: InitiateCallDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      console.log('📞 CallGateway: Call initiate request from user:', userId);
      console.log('📞 CallGateway: Call data:', data);
      
      if (!userId) {
        client.emit('call:error', { message: 'User not authenticated' });
        return;
      }

      const call = await this.callService.initiateCall(userId, data);

      // Notify caller
      client.emit('call:initiated', {
        callId: call._id,
        call,
        message: 'Call initiated successfully',
      });

      // Notify receiver
      console.log('📩 CallGateway: Sending call:incoming to room user_' + data.receiverId);
      this.server.to(`user_${data.receiverId}`).emit('call:incoming', {
        callId: call._id,
        call,
        caller: client.data.user,
      });

      // Log call initiation for debugging
      console.log(`📞 CallGateway: Call ${call._id}: ${userId} -> ${data.receiverId}`);
    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'initiate' 
      });
    }
  }

  @SubscribeMessage('call:accept')
  async handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AcceptCallDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      console.log('✅ CallGateway: Call accept request from user:', userId);
      console.log('✅ CallGateway: Accept data:', data);
      
      const call = await this.callService.acceptCall(userId, data);

      // Extract caller and receiver IDs (handle populated objects)
      let callerId: string;
      let receiverId: string;
      
      if (typeof call.callerId === 'object' && (call.callerId as any)?._id) {
        callerId = (call.callerId as any)._id.toString();
      } else if (typeof call.callerId === 'string' && call.callerId.includes('ObjectId(')) {
        const match = call.callerId.match(/ObjectId\('([^']+)'\)/);
        callerId = match ? match[1] : call.callerId;
      } else {
        callerId = String(call.callerId);
      }
      
      if (typeof call.receiverId === 'object' && (call.receiverId as any)?._id) {
        receiverId = (call.receiverId as any)._id.toString();
      } else if (typeof call.receiverId === 'string' && call.receiverId.includes('ObjectId(')) {
        const match = call.receiverId.match(/ObjectId\('([^']+)'\)/);
        receiverId = match ? match[1] : call.receiverId;
      } else {
        receiverId = String(call.receiverId);
      }
      
      console.log('📢 CallGateway: Extracted IDs - callerId:', callerId, 'receiverId:', receiverId);
      
      // Notify both participants  
      console.log('📢 CallGateway: Sending call:accepted to caller room user_' + callerId);
      this.server.to(`user_${callerId}`).emit('call:accepted', {
        callId: data.callId,
        call,
        acceptedBy: userId,
      });
      
      console.log('📢 CallGateway: Sending call:accepted to receiver room user_' + receiverId);
      this.server.to(`user_${receiverId}`).emit('call:accepted', {
        callId: data.callId,
        call,
        acceptedBy: userId,
      });

      // Join both users to call room
      console.log('🏠 CallGateway: Adding users to call room call_' + data.callId);
      this.server.to(`user_${callerId}`).socketsJoin(`call_${data.callId}`);
      this.server.to(`user_${receiverId}`).socketsJoin(`call_${data.callId}`);


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'accept' 
      });
    }
  }

  @SubscribeMessage('call:reject')
  async handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RejectCallDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      console.log('❌ CallGateway: Call reject request from user:', userId);
      console.log('❌ CallGateway: Reject data:', data);
      
      const call = await this.callService.rejectCall(userId, data);

      // Notify caller about rejection
      this.server.to(`user_${call.callerId}`).emit('call:rejected', {
        callId: data.callId,
        call,
        rejectedBy: userId,
        reason: data.reason,
      });


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'reject' 
      });
    }
  }

  @SubscribeMessage('call:end')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EndCallDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      const call = await this.callService.endCall(userId, data);

      // Notify all participants in call room
      this.server.to(`call_${data.callId}`).emit('call:ended', {
        callId: data.callId,
        call,
        endedBy: userId,
        reason: data.reason,
      });

      // Remove users from call room
      this.server.in(`call_${data.callId}`).socketsLeave(`call_${data.callId}`);


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'end' 
      });
    }
  }

  // WebRTC Signaling Events
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      
      // Validate call participation
      const activeCall = await this.callService.getActiveCall(data.callId);
      if (!activeCall || !activeCall.participants.some(p => p.userId === userId)) {
        client.emit('call:error', { message: 'Not authorized for this call' });
        return;
      }

      // Forward offer to target user
      const targetUserId = data.targetUserId || 
        activeCall.participants.find(p => p.userId !== userId)?.userId;

      if (targetUserId) {
        this.server.to(`user_${targetUserId}`).emit('webrtc:offer', {
          callId: data.callId,
          from: userId,
          data: data.data,
        });
      }


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'webrtc_offer' 
      });
    }
  }

  @SubscribeMessage('webrtc:answer')
  async handleWebRTCAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      
      const activeCall = await this.callService.getActiveCall(data.callId);
      if (!activeCall || !activeCall.participants.some(p => p.userId === userId)) {
        client.emit('call:error', { message: 'Not authorized for this call' });
        return;
      }

      // Forward answer to target user
      const targetUserId = data.targetUserId || 
        activeCall.participants.find(p => p.userId !== userId)?.userId;

      if (targetUserId) {
        this.server.to(`user_${targetUserId}`).emit('webrtc:answer', {
          callId: data.callId,
          from: userId,
          data: data.data,
        });
      }


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'webrtc_answer' 
      });
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      
      const activeCall = await this.callService.getActiveCall(data.callId);
      if (!activeCall || !activeCall.participants.some(p => p.userId === userId)) {
        client.emit('call:error', { message: 'Not authorized for this call' });
        return;
      }

      // Forward ICE candidate to target user
      const targetUserId = data.targetUserId || 
        activeCall.participants.find(p => p.userId !== userId)?.userId;

      if (targetUserId) {
        this.server.to(`user_${targetUserId}`).emit('webrtc:ice-candidate', {
          callId: data.callId,
          from: userId,
          candidate: data.data,
        });
      }
    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'webrtc_ice_candidate' 
      });
    }
  }

  @SubscribeMessage('call:join')
  async handleJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinCallDto,
  ) {
    try {
      const userId = client.data.user?.userId;
      
      const activeCall = await this.callService.getActiveCall(data.callId);
      if (!activeCall || !activeCall.participants.some(p => p.userId === userId)) {
        client.emit('call:error', { message: 'Call not found or not authorized' });
        return;
      }

      // Join call room
      client.join(`call_${data.callId}`);

      // Update participant status
      this.callService.updateParticipantStatus(data.callId, userId, true);

      // Notify other participants
      client.to(`call_${data.callId}`).emit('call:participant-joined', {
        callId: data.callId,
        userId,
        user: client.data.user,
        mediaConstraints: data.mediaConstraints,
      });

      client.emit('call:joined', {
        callId: data.callId,
        activeCall,
      });


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'join' 
      });
    }
  }

  @SubscribeMessage('call:media-status')
  async handleMediaStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; audio?: boolean; video?: boolean },
  ) {
    try {
      const userId = client.data.user?.userId;

      // Update media status
      this.callService.updateMediaStatus(data.callId, userId, {
        audio: data.audio,
        video: data.video,
      });

      // Notify other participants
      client.to(`call_${data.callId}`).emit('call:media-status-changed', {
        callId: data.callId,
        userId,
        audio: data.audio,
        video: data.video,
      });


    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'media_status' 
      });
    }
  }
}