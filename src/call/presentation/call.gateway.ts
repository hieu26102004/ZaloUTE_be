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

@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class CallGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallGateway.name);

  constructor(private readonly callService: CallService) {}

  afterInit(server: Server) {
    this.logger.log('Call Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.data.user?.userId;
    if (userId) {
      this.callService.registerUserSocket(userId, client.id);
      client.join(`user_${userId}`);
      this.logger.log(`User ${userId} connected to call gateway`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.userId;
    if (userId) {
      this.callService.unregisterUserSocket(userId);
      this.logger.log(`User ${userId} disconnected from call gateway`);
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
      this.server.to(`user_${data.receiverId}`).emit('call:incoming', {
        callId: call._id,
        call,
        caller: client.data.user,
      });

      this.logger.log(`Call initiated: ${call._id} from ${userId} to ${data.receiverId}`);
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
      const call = await this.callService.acceptCall(userId, data);

      // Notify both participants
      const activeCall = await this.callService.getActiveCall(data.callId);
      if (activeCall) {
        for (const participant of activeCall.participants) {
          this.server.to(`user_${participant.userId}`).emit('call:accepted', {
            callId: data.callId,
            call,
            acceptedBy: userId,
          });
        }

        // Join both users to call room
        this.server.to(`user_${call.callerId}`).socketsJoin(`call_${data.callId}`);
        this.server.to(`user_${call.receiverId}`).socketsJoin(`call_${data.callId}`);
      }

      this.logger.log(`Call accepted: ${data.callId} by user ${userId}`);
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
      const call = await this.callService.rejectCall(userId, data);

      // Notify caller about rejection
      this.server.to(`user_${call.callerId}`).emit('call:rejected', {
        callId: data.callId,
        call,
        rejectedBy: userId,
        reason: data.reason,
      });

      this.logger.log(`Call rejected: ${data.callId} by user ${userId}`);
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

      this.logger.log(`Call ended: ${data.callId} by user ${userId}`);
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

      this.logger.log(`WebRTC offer sent in call ${data.callId}`);
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

      this.logger.log(`WebRTC answer sent in call ${data.callId}`);
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

      this.logger.log(`User ${userId} joined call ${data.callId}`);
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

      this.logger.log(`Media status updated for user ${userId} in call ${data.callId}`);
    } catch (error) {
      client.emit('call:error', { 
        message: error.message,
        event: 'media_status' 
      });
    }
  }
}