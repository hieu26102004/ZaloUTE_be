import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FriendshipRepository } from '../domain/repositories/friendship.repository';
import {
  FriendshipEntity,
  FriendshipStatus,
} from '../domain/entities/friendship.entity';
import { Friendship } from './friendship.schema';

@Injectable()
export class FriendshipRepositoryImpl implements FriendshipRepository {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<Friendship>,
  ) {}

  async create(
    friendship: Omit<FriendshipEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FriendshipEntity> {
    const createdFriendship = new this.friendshipModel(friendship);
    const saved = await createdFriendship.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const friendship = await this.friendshipModel.findById(id);
    return friendship ? this.mapToEntity(friendship) : null;
  }

  async findByUsers(
    requesterId: string,
    receiverId: string,
  ): Promise<FriendshipEntity | null> {
    const friendship = await this.friendshipModel.findOne({
      $or: [
        {
          $and: [
            {
              $or: [
                { requesterId: new Types.ObjectId(requesterId) },
                { requesterId: requesterId },
              ],
            },
            {
              $or: [
                { receiverId: new Types.ObjectId(receiverId) },
                { receiverId: receiverId },
              ],
            },
          ],
        },
        {
          $and: [
            {
              $or: [
                { requesterId: new Types.ObjectId(receiverId) },
                { requesterId: receiverId },
              ],
            },
            {
              $or: [
                { receiverId: new Types.ObjectId(requesterId) },
                { receiverId: requesterId },
              ],
            },
          ],
        },
      ],
    });
    return friendship ? this.mapToEntity(friendship) : null;
  }

  async findFriendsByUserId(
    userId: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity[]> {
    const friendships = await this.friendshipModel.find({
      $or: [
        {
          $or: [
            { requesterId: new Types.ObjectId(userId) },
            { requesterId: userId },
          ],
        },
        {
          $or: [
            { receiverId: new Types.ObjectId(userId) },
            { receiverId: userId },
          ],
        },
      ],
      status,
    });
    return friendships.map((friendship) => this.mapToEntity(friendship));
  }

  async findPendingRequestsByUserId(
    userId: string,
  ): Promise<FriendshipEntity[]> {
    const friendships = await this.friendshipModel.find({
      $or: [{ receiverId: new Types.ObjectId(userId) }, { receiverId: userId }],
      status: FriendshipStatus.PENDING,
    });
    return friendships.map((friendship) => this.mapToEntity(friendship));
  }

  async getPendingRequestsWithUserInfo(userId: string): Promise<any[]> {
    const pendingRequests = await this.friendshipModel.aggregate([
      {
        $match: {
          $or: [
            { receiverId: new Types.ObjectId(userId) },
            { receiverId: userId },
          ],
          status: FriendshipStatus.PENDING,
        },
      },
      {
        $addFields: {
          requesterObjectId: {
            $cond: {
              if: { $type: '$requesterId' },
              then: {
                $cond: {
                  if: { $eq: [{ $type: '$requesterId' }, 'objectId'] },
                  then: '$requesterId',
                  else: { $toObjectId: '$requesterId' },
                },
              },
              else: { $toObjectId: '$requesterId' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'requesterObjectId',
          foreignField: '_id',
          as: 'requester',
        },
      },
      {
        $project: {
          _id: 1,
          requester: { $arrayElemAt: ['$requester', 0] },
          createdAt: 1,
          status: 1,
        },
      },
      {
        $project: {
          _id: 1,
          'requester._id': 1,
          'requester.username': 1,
          'requester.email': 1,
          'requester.firstname': 1,
          'requester.lastname': 1,
          createdAt: 1,
          status: 1,
        },
      },
    ]);

    return pendingRequests;
  }

  async updateStatus(
    id: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity | null> {
    const friendship = await this.friendshipModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    return friendship ? this.mapToEntity(friendship) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.friendshipModel.findByIdAndDelete(id);
    return !!result;
  }

  async getFriendsWithUserInfo(userId: string): Promise<any[]> {
    const friends = await this.friendshipModel.aggregate([
      {
        $match: {
          $or: [
            { requesterId: new Types.ObjectId(userId) },
            { requesterId: userId },
            { receiverId: new Types.ObjectId(userId) },
            { receiverId: userId },
          ],
          status: FriendshipStatus.ACCEPTED,
        },
      },
      {
        $addFields: {
          requesterObjectId: {
            $cond: {
              if: { $eq: [{ $type: '$requesterId' }, 'objectId'] },
              then: '$requesterId',
              else: { $toObjectId: '$requesterId' },
            },
          },
          receiverObjectId: {
            $cond: {
              if: { $eq: [{ $type: '$receiverId' }, 'objectId'] },
              then: '$receiverId',
              else: { $toObjectId: '$receiverId' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'requesterObjectId',
          foreignField: '_id',
          as: 'requester',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'receiverObjectId',
          foreignField: '_id',
          as: 'receiver',
        },
      },
      {
        $project: {
          friend: {
            $cond: [
              {
                $or: [
                  { $eq: ['$requesterId', userId] },
                  { $eq: ['$requesterId', new Types.ObjectId(userId)] },
                ],
              },
              { $arrayElemAt: ['$receiver', 0] },
              { $arrayElemAt: ['$requester', 0] },
            ],
          },
          createdAt: 1,
        },
      },
      {
        $project: {
          'friend._id': 1,
          'friend.username': 1,
          'friend.email': 1,
          'friend.firstname': 1,
          'friend.lastname': 1,
          createdAt: 1,
        },
      },
    ]);

    return friends;
  }

  private mapToEntity(friendship: Friendship): FriendshipEntity {
    return {
      id: (friendship as any)._id.toString(),
      requesterId: friendship.requesterId.toString(),
      receiverId: friendship.receiverId.toString(),
      status: friendship.status,
      createdAt: (friendship as any).createdAt || new Date(),
      updatedAt: (friendship as any).updatedAt || new Date(),
    };
  }
}
