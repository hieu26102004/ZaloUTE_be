import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { FriendshipStatus } from '../../domain/entities/friendship.entity';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    requesterId: string,
    receiverId: string,
  ): Promise<{ message: string }> {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if receiver exists
    const receiver = await this.userRepository.findById(receiverId);
    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findByUsers(
      requesterId,
      receiverId,
    );
    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('Friend request already sent');
      } else if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('Already friends');
      }
    }

    await this.friendshipRepository.create({
      requesterId,
      receiverId,
      status: FriendshipStatus.PENDING,
    });

    return { message: 'Friend request sent successfully' };
  }
}
