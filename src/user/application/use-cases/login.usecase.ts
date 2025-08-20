import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import type { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findByEmail(email);
    if (user && await this.passwordHasher.compare(password, user.password)) {
      return user;
    }
    return null;
  }
}
