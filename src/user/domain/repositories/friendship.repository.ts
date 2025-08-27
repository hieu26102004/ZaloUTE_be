import {
  FriendshipEntity,
  FriendshipStatus,
} from '../entities/friendship.entity';

export interface FriendshipRepository {
  create(
    friendship: Omit<FriendshipEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FriendshipEntity>;
  findById(id: string): Promise<FriendshipEntity | null>;
  findByUsers(
    requesterId: string,
    receiverId: string,
  ): Promise<FriendshipEntity | null>;
  findFriendsByUserId(
    userId: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity[]>;
  findPendingRequestsByUserId(userId: string): Promise<FriendshipEntity[]>;
  updateStatus(
    id: string,
    status: FriendshipStatus,
  ): Promise<FriendshipEntity | null>;
  delete(id: string): Promise<boolean>;
  getFriendsWithUserInfo(userId: string): Promise<any[]>;
}
