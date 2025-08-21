import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';

@Injectable()
export class ActivateAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(email: string, otp: string): Promise<Object> {
    await this.userRepository.activateUser(email, otp);
    return { success: true, message: 'Account activated successfully' };
  }
}
