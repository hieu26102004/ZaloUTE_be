import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Content cannot be empty' })
  content: string;
}

