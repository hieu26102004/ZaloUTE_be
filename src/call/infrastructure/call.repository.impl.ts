import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Call, CallDocument, CallStatus, CallType } from './call.schema';
import { CallRepository } from '../domain/repositories/call.repository';
import { CallEntity, CallStatistics } from '../domain/entities/call.entity';

@Injectable()
export class CallRepositoryImpl implements CallRepository {
  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
  ) {}

  async createCall(callData: Partial<CallEntity>): Promise<CallEntity> {
    const newCall = new this.callModel(callData);
    const savedCall = await newCall.save();
    return this.mapToEntity(savedCall);
  }

  async findCallById(callId: string): Promise<CallEntity | null> {
    const call = await this.callModel
      .findById(callId)
      .populate('callerId', 'username avatar email')
      .populate('receiverId', 'username avatar email')
      .exec();
    
    return call ? this.mapToEntity(call) : null;
  }

  async updateCallStatus(
    callId: string, 
    status: CallStatus, 
    metadata?: any
  ): Promise<CallEntity | null> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    if (metadata) {
      updateData.metadata = metadata;
    }

    if (status === CallStatus.ACCEPTED) {
      updateData.startTime = new Date();
    }

    const updatedCall = await this.callModel
      .findByIdAndUpdate(callId, updateData, { new: true })
      .populate('callerId', 'username avatar email')
      .populate('receiverId', 'username avatar email')
      .exec();

    return updatedCall ? this.mapToEntity(updatedCall) : null;
  }

  async endCall(
    callId: string, 
    endTime: Date, 
    duration: number
  ): Promise<CallEntity | null> {
    const updatedCall = await this.callModel
      .findByIdAndUpdate(
        callId,
        {
          status: CallStatus.ENDED,
          endTime,
          duration,
          updatedAt: new Date(),
        },
        { new: true }
      )
      .populate('callerId', 'username avatar email')
      .populate('receiverId', 'username avatar email')
      .exec();

    return updatedCall ? this.mapToEntity(updatedCall) : null;
  }

  async getCallHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<CallEntity[]> {
    const calls = await this.callModel
      .find({
        $or: [{ callerId: userId }, { receiverId: userId }],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('callerId', 'username avatar email')
      .populate('receiverId', 'username avatar email')
      .exec();

    return calls.map(call => this.mapToEntity(call));
  }

  async findActiveCallsByUser(userId: string): Promise<CallEntity[]> {
    const activeCalls = await this.callModel
      .find({
        $or: [{ callerId: userId }, { receiverId: userId }],
        status: { $in: [CallStatus.PENDING, CallStatus.RINGING, CallStatus.ACCEPTED] },
      })
      .populate('callerId', 'username avatar email')
      .populate('receiverId', 'username avatar email')
      .exec();

    return activeCalls.map(call => this.mapToEntity(call));
  }

  async getCallStatistics(userId: string): Promise<CallStatistics> {
    const pipeline = [
      {
        $match: {
          $or: [{ callerId: userId }, { receiverId: userId }],
        },
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          successfulCalls: {
            $sum: {
              $cond: [{ $eq: ['$status', CallStatus.ENDED] }, 1, 0],
            },
          },
          failedCalls: {
            $sum: {
              $cond: [
                { $in: ['$status', [CallStatus.FAILED, CallStatus.REJECTED, CallStatus.MISSED]] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          averageDuration: {
            $cond: [
              { $gt: ['$successfulCalls', 0] },
              { $divide: ['$totalDuration', '$successfulCalls'] },
              0,
            ],
          },
        },
      },
    ];

    const result = await this.callModel.aggregate(pipeline).exec();
    
    if (result.length === 0) {
      return {
        totalCalls: 0,
        totalDuration: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
      };
    }

    const stats = result[0];
    return {
      totalCalls: stats.totalCalls,
      totalDuration: stats.totalDuration,
      successfulCalls: stats.successfulCalls,
      failedCalls: stats.failedCalls,
      averageDuration: Math.round(stats.averageDuration),
    };
  }

  async deleteCall(callId: string): Promise<boolean> {
    const result = await this.callModel.findByIdAndDelete(callId).exec();
    return !!result;
  }

  private mapToEntity(call: CallDocument): CallEntity {
    return {
      _id: call._id.toString(),
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
      callType: call.callType,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration,
      failureReason: call.failureReason,
      metadata: call.metadata,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }
}