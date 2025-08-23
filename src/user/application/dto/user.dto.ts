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

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstname: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  lastname: string;

  @ApiProperty({ example: '1234567890', description: 'User phone number' })
  phone: string;
}

export class ValidateEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;
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

export class VerifyForgotPasswordOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code sent to email',
  })
  otp: string;
}

export class UserProfileDto {
  @ApiProperty({ example: '60d5ec49f0d2c84d8c8e1a5b', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'username123', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstname: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastname: string;

  @ApiProperty({ example: '1234567890', description: 'Phone number' })
  phone: string;

  @ApiProperty({ example: true, description: 'Account active status' })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Updated at' })
  updatedAt: Date;
}
