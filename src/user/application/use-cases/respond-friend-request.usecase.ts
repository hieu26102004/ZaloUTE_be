import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { FriendshipStatus } from '../../domain/entities/friendship.entity';

@Injectable()
export class RespondFriendRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(
    friendshipId: string,
    userId: string,
    action: 'accept' | 'reject',
  ): Promise<{ message: string }> {
    const friendship = await this.friendshipRepository.findById(friendshipId);

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiverId !== userId) {
      throw new BadRequestException(
        'You can only respond to friend requests sent to you',
      );
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(
        'Friend request has already been responded to',
      );
    }

    const newStatus =
      action === 'accept'
        ? FriendshipStatus.ACCEPTED
        : FriendshipStatus.REJECTED;
    await this.friendshipRepository.updateStatus(friendshipId, newStatus);

    const message =
      action === 'accept'
        ? 'Friend request accepted'
        : 'Friend request rejected';
    return { message };
  }
}
