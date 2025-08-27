import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsMongoId()
  conversationId?: string;

  @IsOptional()
  @IsMongoId()
  receiverId?: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsIn(['text', 'image', 'file'])
  type?: string;
}
