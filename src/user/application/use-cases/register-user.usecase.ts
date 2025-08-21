import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';
import type { UserEntity } from '../../domain/entities/user.entity';
import type { MailService } from 'src/shared/interfaces/mail.service';
import { MAIL_SERVICE } from 'src/shared/interfaces/mail-service.token';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async execute(
    username: string,
    email: string,
    password: string,
    firstname: string,
    lastname: string,
    phone: string,
  ): Promise<Partial<UserEntity>> {
    const existedEmail = await this.userRepository.findByEmail(email);
    if (existedEmail) throw new Error('Email already exists');

    const existedUsername = await (this.userRepository as any).findByUsername(
      username,
    );
    if (existedUsername) throw new Error('Username already exists');

    const hashedPassword = await this.passwordHasher.hash(password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    const user = await this.userRepository.createUser({
      username,
      email,
      password: hashedPassword,
      firstname,
      lastname,
      phone,
      otp,
      otpExpiresAt,
    });
    await this.mailService.sendMail(
      email,
      'Account Activation',
      `Your OTP code is: ${otp}`,
      `<p>Your OTP code is: <strong>${otp}</strong></p>`,
    );
    return user;
  }
}
