
import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(email: string, otp: string, newPassword: string): Promise<Object> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (!user.otp || !user.otpExpiresAt) throw new Error('No OTP requested');
    if (user.otp !== otp) throw new Error('Invalid OTP');
    if (user.otpExpiresAt < new Date()) throw new Error('OTP expired');

    const hashedPassword = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updateUser(user.id, {
      password: hashedPassword,
      otp: undefined,
      otpExpiresAt: undefined,
    });
    return { success: true, message: 'Account activated successfully' };
  }
}
