import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from 'src/user/domain/repositories/user-repository.token';

@Injectable()
export class ValidateEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(email: string): Promise<{ isValid: boolean; message: string }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Invalid email format',
      };
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      return {
        isValid: false,
        message: 'Email already exists',
      };
    }

    return {
      isValid: true,
      message: 'Email is valid and available',
    };
  }
}
