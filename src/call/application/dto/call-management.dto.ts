import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CallType } from '../../infrastructure/call.schema';

export class InitiateCallDto {
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @IsEnum(CallType)
  @IsNotEmpty()
  callType: CallType;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class AcceptCallDto {
  @IsNotEmpty()
  @IsString()
  callId: string;
}

export class RejectCallDto {
  @IsNotEmpty()
  @IsString()
  callId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class EndCallDto {
  @IsNotEmpty()
  @IsString()
  callId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}