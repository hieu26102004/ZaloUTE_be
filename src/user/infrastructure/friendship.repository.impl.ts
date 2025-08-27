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
          requesterId: new Types.ObjectId(requesterId),
          receiverId: new Types.ObjectId(receiverId),
        },
        {
          requesterId: new Types.ObjectId(receiverId),
          receiverId: new Types.ObjectId(requesterId),
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
        { requesterId: new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) },
      ],
      status,
    });
    return friendships.map((friendship) => this.mapToEntity(friendship));
  }

  async findPendingRequestsByUserId(
    userId: string,
  ): Promise<FriendshipEntity[]> {
    const friendships = await this.friendshipModel.find({
      receiverId: new Types.ObjectId(userId),
      status: FriendshipStatus.PENDING,
    });
    return friendships.map((friendship) => this.mapToEntity(friendship));
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
            { receiverId: new Types.ObjectId(userId) },
          ],
          status: FriendshipStatus.ACCEPTED,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'requesterId',
          foreignField: '_id',
          as: 'requester',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'receiver',
        },
      },
      {
        $project: {
          friend: {
            $cond: [
              { $eq: ['$requesterId', new Types.ObjectId(userId)] },
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
