import { Injectable } from '@nestjs/common';

@Injectable()
export class ForgotPasswordUseCase {
  async execute(email: string): Promise<void> {
    // Generate OTP and save to user
    // Send OTP via email (mock)
  }
}
