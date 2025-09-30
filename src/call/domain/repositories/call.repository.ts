import { CallEntity, CallStatistics } from '../entities/call.entity';
import { CallStatus, CallType } from '../../infrastructure/call.schema';

export interface CallRepository {
  createCall(callData: Partial<CallEntity>): Promise<CallEntity>;
  
  findCallById(callId: string): Promise<CallEntity | null>;
  
  updateCallStatus(callId: string, status: CallStatus, metadata?: any): Promise<CallEntity | null>;
  
  endCall(callId: string, endTime: Date, duration: number): Promise<CallEntity | null>;
  
  getCallHistory(userId: string, limit?: number, offset?: number): Promise<CallEntity[]>;
  
  findActiveCallsByUser(userId: string): Promise<CallEntity[]>;
  
  getCallStatistics(userId: string): Promise<CallStatistics>;
  
  deleteCall(callId: string): Promise<boolean>;
}