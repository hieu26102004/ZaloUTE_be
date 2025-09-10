import { IsNotEmpty, IsString, IsArray, ArrayMinSize, IsOptional, ArrayUnique } from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2) // Minimum 2 other participants + creator = 3 total
  @ArrayUnique() // Ensure no duplicate IDs
  participantIds: string[];

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateGroupNameDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class AddGroupMemberDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique() // Ensure no duplicate IDs when adding members
  userIds: string[];
}

export class RemoveGroupMemberDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class UpdateGroupAvatarDto {
  @IsNotEmpty()
  @IsString()
  avatar: string;
}
