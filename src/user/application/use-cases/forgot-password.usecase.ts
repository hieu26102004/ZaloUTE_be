import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { MailService } from 'src/shared/interfaces/mail.service';
import { MAIL_SERVICE } from 'src/shared/interfaces/mail-service.token';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await this.userRepository.updateUser(user.id, { otp, otpExpiresAt });

    await this.mailService.sendMail(
      email,
      'Quên mật khẩu - OTP',
      `Mã OTP của bạn là: ${otp}`,
      `<p>Mã OTP của bạn là: <strong>${otp}</strong></p>`,
    );
  }
}
