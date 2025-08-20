import { UserEntity } from '../entities/user.entity';

export interface UserRepository {
  createUser(user: Partial<UserEntity>): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
}
