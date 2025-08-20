import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'username123', description: 'User username' })
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({ example: 'strongPassword123', description: 'User password' })
  password: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com or username123',
    description: 'User email address or username)',
  })
  identifier: string;

  @ApiProperty({ example: 'strongPassword123', description: 'User password' })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  otp: string;

  @ApiProperty({
    example: 'newStrongPassword123',
    description: 'New password to set',
  })
  newPassword: string;
}

export class ActivateAccountDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  otp: string;
}
