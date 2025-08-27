import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { FriendshipStatus } from '../../domain/entities/friendship.entity';

@Injectable()
export class UnfriendUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(
    userId: string,
    friendId: string,
  ): Promise<{ message: string }> {
    const friendship = await this.friendshipRepository.findByUsers(
      userId,
      friendId,
    );

    if (!friendship) {
      throw new BadRequestException('No friendship found');
    }

    if (friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new BadRequestException('You are not friends with this user');
    }

    await this.friendshipRepository.delete(friendship.id);

    return { message: 'Friend removed successfully' };
  }
}
