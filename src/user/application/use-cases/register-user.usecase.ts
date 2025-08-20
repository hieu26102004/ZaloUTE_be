import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import type { PasswordHasher } from '../../domain/repositories/password-hasher';
import { PASSWORD_HASHER } from '../../domain/repositories/password-hasher.token';
import type { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class RegisterUserUseCase {
  constructor(
  @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(username: string, email: string, password: string): Promise<UserEntity> {
    const hashedPassword = await this.passwordHasher.hash(password);
    return this.userRepository.createUser({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
