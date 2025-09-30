import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CALL_REPOSITORY_TOKEN } from '../../domain/repositories/call.repository.token';
import { CallEntity, ActiveCall, CallParticipant } from '../../domain/entities/call.entity';
import { CallType, CallStatus } from '../../infrastructure/call.schema';
import { InitiateCallDto, AcceptCallDto, RejectCallDto, EndCallDto } from '../dto/call-management.dto';

@Injectable()
export class CallService {
  private activeCalls = new Map<string, ActiveCall>(); // In-memory storage for active calls
  private userSockets = new Map<string, string>(); // userId -> socketId mapping

  constructor(
    @Inject(CALL_REPOSITORY_TOKEN)
    private readonly callRepository: CallRepository,
  ) {}

  async initiateCall(callerId: string, initiateCallDto: InitiateCallDto): Promise<CallEntity> {
    const { receiverId, callType } = initiateCallDto;

    // Validate call permissions
    await this.validateCallPermissions(callerId, receiverId);

    // Check if user is available for calls
    const isReceiverAvailable = await this.checkUserAvailability(receiverId);
    if (!isReceiverAvailable) {
      throw new BadRequestException('Receiver is currently unavailable for calls');
    }

    // Create call record
    const callData: Partial<CallEntity> = {
      callerId,
      receiverId,
      callType,
      status: CallStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newCall = await this.callRepository.createCall(callData);

    // Add to active calls
    const activeCall: ActiveCall = {
      callId: newCall._id!,
      participants: [
        {
          userId: callerId,
          socketId: this.userSockets.get(callerId) || '',
          userName: '', // Will be populated by gateway
          isReady: false,
          mediaStatus: { audio: true, video: callType === CallType.VIDEO },
        },
        {
          userId: receiverId,
          socketId: this.userSockets.get(receiverId) || '',
          userName: '', // Will be populated by gateway
          isReady: false,
          mediaStatus: { audio: true, video: callType === CallType.VIDEO },
        },
      ],
      callType,
      status: CallStatus.PENDING,
      startTime: new Date(),
    };

    this.activeCalls.set(newCall._id!, activeCall);

    return newCall;
  }

  async acceptCall(userId: string, acceptCallDto: AcceptCallDto): Promise<CallEntity> {
    const { callId } = acceptCallDto;
    
    const call = await this.callRepository.findCallById(callId);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.receiverId !== userId) {
      throw new ForbiddenException('You are not authorized to accept this call');
    }

    if (call.status !== CallStatus.PENDING && call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call cannot be accepted in its current state');
    }

    // Update call status
    const updatedCall = await this.callRepository.updateCallStatus(
      callId,
      CallStatus.ACCEPTED,
      { acceptedAt: new Date() }
    );

    // Update active call
    const activeCall = this.activeCalls.get(callId);
    if (activeCall) {
      activeCall.status = CallStatus.ACCEPTED;
      const participant = activeCall.participants.find(p => p.userId === userId);
      if (participant) {
        participant.isReady = true;
      }
    }

    return updatedCall!;
  }

  async rejectCall(userId: string, rejectCallDto: RejectCallDto): Promise<CallEntity> {
    const { callId, reason } = rejectCallDto;

    const call = await this.callRepository.findCallById(callId);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.receiverId !== userId) {
      throw new ForbiddenException('You are not authorized to reject this call');
    }

    if (call.status === CallStatus.ENDED || call.status === CallStatus.REJECTED) {
      throw new BadRequestException('Call has already ended');
    }

    // Update call status
    const updatedCall = await this.callRepository.updateCallStatus(
      callId,
      CallStatus.REJECTED,
      { rejectedAt: new Date(), rejectionReason: reason }
    );

    // Remove from active calls
    this.activeCalls.delete(callId);

    return updatedCall!;
  }

  async endCall(userId: string, endCallDto: EndCallDto): Promise<CallEntity> {
    const { callId, reason } = endCallDto;

    const call = await this.callRepository.findCallById(callId);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException('You are not authorized to end this call');
    }

    const endTime = new Date();
    let duration = 0;

    // Calculate duration if call was accepted
    if (call.startTime) {
      duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);
    }

    // Update call record
    const updatedCall = await this.callRepository.endCall(callId, endTime, duration);

    // Remove from active calls
    this.activeCalls.delete(callId);

    return updatedCall!;
  }

  async getCallHistory(userId: string, limit = 50, offset = 0): Promise<CallEntity[]> {
    return this.callRepository.getCallHistory(userId, limit, offset);
  }

  async getActiveCall(callId: string): Promise<ActiveCall | null> {
    return this.activeCalls.get(callId) || null;
  }

  async getUserActiveCalls(userId: string): Promise<CallEntity[]> {
    return this.callRepository.findActiveCallsByUser(userId);
  }

  // Socket management methods
  registerUserSocket(userId: string, socketId: string): void {
    this.userSockets.set(userId, socketId);
  }

  unregisterUserSocket(userId: string): void {
    this.userSockets.delete(userId);
  }

  updateParticipantStatus(callId: string, userId: string, isReady: boolean): void {
    const activeCall = this.activeCalls.get(callId);
    if (activeCall) {
      const participant = activeCall.participants.find(p => p.userId === userId);
      if (participant) {
        participant.isReady = isReady;
      }
    }
  }

  updateMediaStatus(
    callId: string, 
    userId: string, 
    mediaStatus: { audio?: boolean; video?: boolean }
  ): void {
    const activeCall = this.activeCalls.get(callId);
    if (activeCall) {
      const participant = activeCall.participants.find(p => p.userId === userId);
      if (participant) {
        if (mediaStatus.audio !== undefined) {
          participant.mediaStatus.audio = mediaStatus.audio;
        }
        if (mediaStatus.video !== undefined) {
          participant.mediaStatus.video = mediaStatus.video;
        }
      }
    }
  }

  // Validation methods
  private async validateCallPermissions(callerId: string, receiverId: string): Promise<void> {
    if (callerId === receiverId) {
      throw new BadRequestException('Cannot call yourself');
    }

    // Check if caller has active calls
    const callerActiveCalls = await this.callRepository.findActiveCallsByUser(callerId);
    if (callerActiveCalls.length > 0) {
      throw new BadRequestException('You already have an active call');
    }

    // Check if receiver has active calls  
    const receiverActiveCalls = await this.callRepository.findActiveCallsByUser(receiverId);
    if (receiverActiveCalls.length > 0) {
      throw new BadRequestException('Receiver is currently in another call');
    }

    // Additional friendship/contact validation can be added here
    // const areFriends = await this.friendshipService.areFriends(callerId, receiverId);
    // if (!areFriends) {
    //   throw new ForbiddenException('You can only call your friends');
    // }
  }

  private async checkUserAvailability(userId: string): Promise<boolean> {
    // Check if user is online and available
    // This would typically involve checking user status, do not disturb mode, etc.
    
    // For now, just check if user has a socket connection
    return this.userSockets.has(userId);
  }

  // Cleanup method for when server restarts
  async cleanupInactiveCalls(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [callId, activeCall] of this.activeCalls.entries()) {
      if (activeCall.startTime < oneHourAgo) {
        // End stale calls
        await this.callRepository.updateCallStatus(callId, CallStatus.FAILED);
        this.activeCalls.delete(callId);
      }
    }
  }
}