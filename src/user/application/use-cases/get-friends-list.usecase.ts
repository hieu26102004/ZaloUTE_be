import { Injectable, Inject } from '@nestjs/common';
import { FRIENDSHIP_REPOSITORY_TOKEN } from '../../domain/repositories/friendship-repository.token';
import type { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { FriendDto } from '../dto/friendship.dto';

@Injectable()
export class GetFriendsListUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY_TOKEN)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(userId: string): Promise<FriendDto[]> {
    const friendsData =
      await this.friendshipRepository.getFriendsWithUserInfo(userId);

    return friendsData.map((item) => ({
      id: item.friend._id.toString(),
      username: item.friend.username,
      email: item.friend.email,
      firstname: item.friend.firstname,
      lastname: item.friend.lastname,
      friendsSince: item.createdAt,
    }));
  }
}
