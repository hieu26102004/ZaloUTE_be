import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export enum SignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
}

export class WebRTCSignalDto {
  @IsNotEmpty()
  @IsString()
  callId: string;

  @IsEnum(SignalType)
  @IsNotEmpty()
  type: SignalType;

  @IsNotEmpty()
  @IsObject()
  data: any; // SDP offer/answer or ICE candidate

  @IsOptional()
  @IsString()
  targetUserId?: string;
}

export class JoinCallDto {
  @IsNotEmpty()
  @IsString()
  callId: string;

  @IsOptional()
  @IsObject()
  mediaConstraints?: {
    video: boolean;
    audio: boolean;
  };
}