import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CallDocument = Call & Document & {
  _id: Types.ObjectId;
};

export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum CallStatus {
  PENDING = 'pending',
  RINGING = 'ringing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ENDED = 'ended',
  MISSED = 'missed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Call {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  callerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ enum: CallType, required: true })
  callType: CallType;

  @Prop({ enum: CallStatus, default: CallStatus.PENDING })
  status: CallStatus;

  @Prop({ type: Date })
  startTime?: Date;

  @Prop({ type: Date })
  endTime?: Date;

  @Prop({ type: Number, default: 0 })
  duration: number; // in seconds

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: Object })
  metadata?: {
    quality?: string;
    networkType?: string;
    deviceInfo?: string;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CallSchema = SchemaFactory.createForClass(Call);

// Indexes for better query performance
CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ receiverId: 1, createdAt: -1 });
CallSchema.index({ status: 1 });
CallSchema.index({ createdAt: -1 });