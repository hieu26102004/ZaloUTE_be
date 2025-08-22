import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';

@Injectable()
export class VerifyForgotPasswordOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (!user.otp || !user.otpExpiresAt) throw new Error('No OTP requested');
    if (user.otp !== otp) throw new Error('Invalid OTP');
    if (user.otpExpiresAt < new Date()) throw new Error('OTP expired');
    return { message: 'OTP verified successfully' };
  }
}
