import { Injectable } from '@nestjs/common';

@Injectable()
export class VerifyOtpUseCase {
  async execute(email: string, otp: string): Promise<boolean> {
    // Verify OTP logic
    return true;
  }
}
