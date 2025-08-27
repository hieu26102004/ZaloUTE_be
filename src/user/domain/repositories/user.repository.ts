import { UserEntity } from '../entities/user.entity';

export interface UserRepository {
  createUser(user: Partial<UserEntity>): Promise<Partial<UserEntity>>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
  activateUser(email: string, otp: string): Promise<Partial<UserEntity>>;
  searchByEmail(email: string): Promise<UserEntity[]>;
  findByPhone(phone: string): Promise<UserEntity | null>;
}
