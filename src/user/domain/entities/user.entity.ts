export class UserEntity {
  id: string;
  username: string;
  email: string;
  password: string;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
