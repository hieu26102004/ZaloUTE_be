import { Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { MailService } from '../../../shared/infrastructure/mail.service';
import { USER_REPOSITORY } from 'src/user/domain/repositories/user-repository.token';
import { MAIL_SERVICE } from 'src/shared/interfaces/mail-service.token';

@Injectable()
export class ResendOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (user.isActive) throw new Error('Account already activated');

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.userRepository.updateUser(user.id, { otp, otpExpiresAt });

    // Send OTP via email
    await this.mailService.sendMail(
      user.email,
      'Account Activation - Resend OTP',
      `Your new OTP code is: ${otp}`,
      `<p>Your new OTP code is: <strong>${otp}</strong></p>`
    );

    return { message: 'OTP resent successfully' };
  }
}
