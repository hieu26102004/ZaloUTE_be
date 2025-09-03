export class UserEntity {
  id: string;
  username: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  phone: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  isActive: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
