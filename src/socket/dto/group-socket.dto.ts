import { IsNotEmpty, IsString, IsArray, ArrayMinSize, IsOptional, ArrayUnique } from 'class-validator';

export class CreateGroupSocketDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique() // Ensure no duplicate IDs
  participantIds: string[];

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateGroupNameSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class AddGroupMemberSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique() // Ensure no duplicate IDs when adding members
  userIds: string[];
}

export class RemoveGroupMemberSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class LeaveGroupSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}

export class TransferGroupAdminSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  newAdminId: string;
}

export class DissolveGroupSocketDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}
