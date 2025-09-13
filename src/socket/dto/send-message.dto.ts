import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsIn(['text', 'image', 'video', 'file', 'emoji', 'sticker'])
  type?: string;
}
