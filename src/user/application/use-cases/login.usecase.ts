import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import type { UserEntity } from '../../domain/entities/user.entity';
import { JWT_SERVICE } from 'src/shared/interfaces/jwt-service.token';
import type { JwtService } from 'src/shared/interfaces/jwt.service';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(JWT_SERVICE) private readonly jwtService: JwtService,
  ) {}

  async execute(identifier: string, password: string): Promise<{ user: Partial<UserEntity>; accessToken: string }> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      // Kiểm tra format email hợp lệ
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
      if (!emailRegex.test(identifier)) {
        throw new UnauthorizedException('Format email không hợp lệ');
      }
    }
    const user = isEmail
      ? await this.userRepository.findByEmail(identifier)
      : await this.userRepository.findByUsername(identifier);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await this.passwordHasher.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, username: user.username });
    const { password: _password, otp, otpExpiresAt, ...safeUser } = user;
    return { user: safeUser, accessToken };
  }
}
