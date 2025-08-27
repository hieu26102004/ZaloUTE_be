import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { UserProfileDto } from '../dto/friendship.dto';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { FriendshipStatus } from '../../domain/entities/friendship.entity';

@Injectable()
export class SearchUserByEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(
    email: string,
    currentUserId: string,
  ): Promise<UserProfileDto[]> {
    const users = await this.userRepository.searchByEmail(email);

    // Filter out current user
    const filteredUsers = users.filter((user) => user.id !== currentUserId);

    const userProfiles: UserProfileDto[] = [];

    for (const user of filteredUsers) {
      const friendship = await this.friendshipRepository.findByUsers(
        currentUserId,
        user.id,
      );

      const profile: UserProfileDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        createdAt: user.createdAt,
        isFriend: friendship?.status === FriendshipStatus.ACCEPTED,
        friendshipStatus: friendship?.status || 'none',
      };

      userProfiles.push(profile);
    }

    return userProfiles;
  }
}
