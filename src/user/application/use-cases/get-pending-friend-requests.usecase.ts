import { Injectable, Inject } from '@nestjs/common';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { PendingFriendRequestDto } from '../dto/friendship.dto';

@Injectable()
export class GetPendingFriendRequestsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(userId: string): Promise<PendingFriendRequestDto[]> {
    const pendingRequests =
      await this.friendshipRepository.getPendingRequestsWithUserInfo(userId);

    return pendingRequests.map((request) => ({
      friendshipId: request._id.toString(),
      requester: {
        id: request.requester._id.toString(),
        username: request.requester.username,
        email: request.requester.email,
        firstname: request.requester.firstname,
        lastname: request.requester.lastname,
        avatarUrl: request.requester.avatarUrl,
      },
      createdAt: request.createdAt,
      status: request.status,
    }));
  }
}
