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

    console.log('🏁 CallService: Initiating call from', callerId, 'to', receiverId);

    // First cleanup any stale calls for this user
    await this.forceCleanupUserCalls(callerId);

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
    
    console.log('✅ CallService: Accept call request for callId:', callId, 'from user:', userId);
    
    const call = await this.callRepository.findCallById(callId);
    if (!call) {
      console.log('❌ CallService: Call not found:', callId);
      throw new NotFoundException('Call not found');
    }
    
    console.log('✅ CallService: Found call:', call._id, 'status:', call.status, 'caller:', call.callerId, 'receiver:', call.receiverId);

    console.log('✅ CallService: Authorization check - call.receiverId:', call.receiverId, 'userId:', userId);
    console.log('✅ CallService: Type check - receiverId type:', typeof call.receiverId, 'userId type:', typeof userId);
    console.log('✅ CallService: Length check - receiverId length:', call.receiverId?.length, 'userId length:', userId?.length);
    
    // Handle populated receiverId (object) vs string comparison
    let receiverIdToCompare: string;
    console.log('🔍 CallService: Checking receiverId structure...');
    console.log('🔍 CallService: call.receiverId:', JSON.stringify(call.receiverId));
    
    // Try to extract ID from receiverId
    if (call.receiverId && typeof call.receiverId === 'object' && '_id' in call.receiverId) {
      // Direct object with _id property
      const extracted = (call.receiverId as any)._id;
      receiverIdToCompare = extracted.toString();
      console.log('✅ CallService: Extracted receiverId from direct object:', receiverIdToCompare);
    } else if (typeof call.receiverId === 'string' && call.receiverId.includes('ObjectId(')) {
      // Stringified object - extract ObjectId
      const objectIdMatch = call.receiverId.match(/ObjectId\('([^']+)'\)/);
      if (objectIdMatch && objectIdMatch[1]) {
        receiverIdToCompare = objectIdMatch[1];
        console.log('✅ CallService: Extracted ObjectId from stringified object:', receiverIdToCompare);
      } else {
        // Fallback: try to parse as JSON and extract _id
        try {
          const parsed = JSON.parse(call.receiverId);
          if (parsed._id) {
            receiverIdToCompare = parsed._id.toString();
            console.log('✅ CallService: Extracted _id from parsed JSON:', receiverIdToCompare);
          } else {
            receiverIdToCompare = call.receiverId;
            console.log('✅ CallService: Using receiverId as direct string (no ObjectId found):', receiverIdToCompare);
          }
        } catch (error) {
          receiverIdToCompare = call.receiverId;
          console.log('✅ CallService: Using receiverId as direct string (JSON parse failed):', receiverIdToCompare);
        }
      }
    } else if (typeof call.receiverId === 'string') {
      // Plain string ID
      receiverIdToCompare = call.receiverId;
      console.log('✅ CallService: Using receiverId as direct string:', receiverIdToCompare);
    } else {
      // Last resort - convert to string
      receiverIdToCompare = String(call.receiverId);
      console.log('⚠️ CallService: Converting receiverId to string (last resort):', receiverIdToCompare);
    }
    
    console.log('🔍 CallService: Final comparison - receiverIdToCompare:', receiverIdToCompare, 'userId:', userId);
    console.log('🔍 CallService: Strict equality:', receiverIdToCompare === userId);
    
    if (receiverIdToCompare !== userId) {
      console.log('❌ CallService: Authorization failed - receiver ID mismatch');
      console.log('❌ CallService: Receiver ID (extracted):', receiverIdToCompare);
      console.log('❌ CallService: User ID:', userId);
      throw new ForbiddenException('You are not authorized to accept this call');
    }
    console.log('✅ CallService: Authorization passed, proceeding with acceptance');

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
    
    console.log('❌ CallService: Reject call request for callId:', callId, 'from user:', userId, 'reason:', reason);

    const call = await this.callRepository.findCallById(callId);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    console.log('❌ CallService: Authorization check - call.receiverId:', call.receiverId, 'userId:', userId);
    console.log('❌ CallService: Type check - receiverId type:', typeof call.receiverId, 'userId type:', typeof userId);
    console.log('❌ CallService: Length check - receiverId length:', call.receiverId?.length, 'userId length:', userId?.length);
    
    // Handle populated receiverId (object) vs string comparison
    let receiverIdToCompare: string;
    console.log('🔍 CallService: Checking receiverId structure...');
    console.log('🔍 CallService: call.receiverId:', JSON.stringify(call.receiverId));
    
    // Try to extract ID from receiverId
    if (call.receiverId && typeof call.receiverId === 'object' && '_id' in call.receiverId) {
      // Direct object with _id property
      const extracted = (call.receiverId as any)._id;
      receiverIdToCompare = extracted.toString();
      console.log('❌ CallService: Extracted receiverId from direct object:', receiverIdToCompare);
    } else if (typeof call.receiverId === 'string' && call.receiverId.includes('ObjectId(')) {
      // Stringified object - extract ObjectId
      const objectIdMatch = call.receiverId.match(/ObjectId\('([^']+)'\)/);
      if (objectIdMatch && objectIdMatch[1]) {
        receiverIdToCompare = objectIdMatch[1];
        console.log('❌ CallService: Extracted ObjectId from stringified object:', receiverIdToCompare);
      } else {
        // Fallback: try to parse as JSON and extract _id
        try {
          const parsed = JSON.parse(call.receiverId);
          if (parsed._id) {
            receiverIdToCompare = parsed._id.toString();
            console.log('❌ CallService: Extracted _id from parsed JSON:', receiverIdToCompare);
          } else {
            receiverIdToCompare = call.receiverId;
            console.log('❌ CallService: Using receiverId as direct string (no ObjectId found):', receiverIdToCompare);
          }
        } catch (error) {
          receiverIdToCompare = call.receiverId;
          console.log('❌ CallService: Using receiverId as direct string (JSON parse failed):', receiverIdToCompare);
        }
      }
    } else if (typeof call.receiverId === 'string') {
      // Plain string ID
      receiverIdToCompare = call.receiverId;
      console.log('❌ CallService: Using receiverId as direct string:', receiverIdToCompare);
    } else {
      // Last resort - convert to string
      receiverIdToCompare = String(call.receiverId);
      console.log('⚠️ CallService: Converting receiverId to string (last resort):', receiverIdToCompare);
    }
    
    console.log('🔍 CallService: Final comparison - receiverIdToCompare:', receiverIdToCompare, 'userId:', userId);
    console.log('🔍 CallService: Strict equality:', receiverIdToCompare === userId);
    
    if (receiverIdToCompare !== userId) {
      console.log('❌ CallService: Authorization failed - receiver ID mismatch');
      console.log('❌ CallService: Receiver ID (extracted):', receiverIdToCompare);
      console.log('❌ CallService: User ID:', userId);
      throw new ForbiddenException('You are not authorized to reject this call');
    }
    console.log('✅ CallService: Authorization passed, proceeding with rejection');

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
    console.log('🔍 CallService: Caller active calls:', callerActiveCalls.length, callerActiveCalls.map(c => ({ id: c._id, status: c.status, createdAt: c.createdAt })));
    
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

  // Force cleanup all calls for a user (when initiating new call)
  async forceCleanupUserCalls(userId: string): Promise<void> {
    const activeCalls = await this.callRepository.findActiveCallsByUser(userId);
    console.log('🧹 CallService: Force cleaning up', activeCalls.length, 'active calls for user', userId);
    
    for (const call of activeCalls) {
      console.log('🧹 CallService: Ending call', call._id, 'status:', call.status);
      await this.callRepository.updateCallStatus(call._id!, CallStatus.FAILED);
      this.activeCalls.delete(call._id!);
    }
  }

  // Cleanup stale calls for a specific user
  async cleanupUserStaleCalls(userId: string): Promise<void> {
    const activeCalls = await this.callRepository.findActiveCallsByUser(userId);
    console.log('🧹 CallService: Found', activeCalls.length, 'active calls for user', userId);
    
    for (const call of activeCalls) {
      const now = new Date();
      const callAge = now.getTime() - call.createdAt.getTime();
      const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes
      
      // End calls older than 2 minutes that are still pending
      if (callAge > twoMinutesInMs && call.status === CallStatus.PENDING) {
        console.log('🧹 CallService: Cleaning up stale call', call._id, 'age:', Math.round(callAge / 1000), 'seconds');
        await this.callRepository.updateCallStatus(call._id!, CallStatus.FAILED);
        this.activeCalls.delete(call._id!);
      } else if (call.status === CallStatus.PENDING) {
        // Also cleanup ANY pending calls older than 30 seconds
        const thirtySecondsInMs = 30 * 1000;
        if (callAge > thirtySecondsInMs) {
          console.log('🧹 CallService: Force cleaning up old pending call', call._id, 'age:', Math.round(callAge / 1000), 'seconds');
          await this.callRepository.updateCallStatus(call._id!, CallStatus.FAILED);
          this.activeCalls.delete(call._id!);
        }
      }
    }
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