import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import type { UserEntity } from '../../domain/entities/user.entity';
import type { JwtService as JwtServiceInterface } from 'src/shared/interfaces/jwt.service';
import { JWT_SERVICE } from 'src/shared/interfaces/jwt-service.token';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(JWT_SERVICE) private readonly jwtService: JwtServiceInterface,
  ) {}

  async execute(identifier: string, password: string): Promise<{ user: Partial<UserEntity>; accessToken: string } | null> {
    const isEmail = /.+@.+\..+/.test(identifier);
    const user = isEmail
      ? await this.userRepository.findByEmail(identifier)
      : await this.userRepository.findByUsername(identifier);
    if (!user) return null;

    const isMatch = await this.passwordHasher.compare(password, user.password);
    if (!isMatch) return null;

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, username: user.username });
    const { password: _pw, otp, otpExpiresAt, ...safeUser } = user as any;
    return { user: safeUser, accessToken };
  }
}
