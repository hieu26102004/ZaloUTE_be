import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SearchUserByEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}

export class RespondFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  friendshipId: string;

  @IsString()
  @IsNotEmpty()
  action: 'accept' | 'reject';
}

export class UserProfileDto {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  avatarUrl?: string;
  createdAt: Date;
  isFriend?: boolean;
  friendshipStatus?: string;
}

export class FriendDto {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  avatarUrl?: string;
  friendsSince: Date;
}

export class PendingFriendRequestDto {
  friendshipId: string;
  requester: {
    id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  status: string;
}
