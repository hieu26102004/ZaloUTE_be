import { CallType, CallStatus } from '../../infrastructure/call.schema';

export interface CallEntity {
  _id?: string;
  callerId: string;
  receiverId: string;
  callType: CallType;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  failureReason?: string;
  metadata?: {
    quality?: string;
    networkType?: string;
    deviceInfo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CallParticipant {
  userId: string;
  socketId: string;
  userName: string;
  avatar?: string;
  isReady: boolean;
  mediaStatus: {
    audio: boolean;
    video: boolean;
  };
}

export interface ActiveCall {
  callId: string;
  participants: CallParticipant[];
  callType: CallType;
  status: CallStatus;
  startTime: Date;
}

export interface CallStatistics {
  totalCalls: number;
  totalDuration: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
}