import { IsMongoId, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsMongoId()
  conversationId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
