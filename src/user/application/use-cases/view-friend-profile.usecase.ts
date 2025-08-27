import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { UserProfileDto } from '../dto/friendship.dto';
import { FriendshipStatus } from '../../domain/entities/friendship.entity';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(
    profileUserId: string,
    currentUserId?: string,
  ): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(profileUserId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isFriend = false;
    let friendshipStatus = 'none';

    if (currentUserId && currentUserId !== profileUserId) {
      const friendship = await this.friendshipRepository.findByUsers(
        currentUserId,
        profileUserId,
      );
      if (friendship) {
        isFriend = friendship.status === FriendshipStatus.ACCEPTED;
        friendshipStatus = friendship.status;
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      createdAt: user.createdAt,
      isFriend,
      friendshipStatus,
    };
  }
}
