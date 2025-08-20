import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma.service';
import type { UserRepository } from '../domain/repositories/user.repository';
import type { UserEntity } from '../domain/entities/user.entity';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(user: Partial<UserEntity>): Promise<UserEntity> {
    if (!user.username || !user.email || !user.password) {
      throw new Error('Missing required fields: username, email, or password');
    }
    const created = await this.prisma.user.create({
      data: {
        username: user.username,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
    return {
      id: created.id,
      username: created.username,
      email: created.email,
      password: created.password,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      // Add other fields if needed
    };
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const found = await this.prisma.user.findUnique({ where: { email } });
    if (!found) return null;
    return {
      id: found.id,
      username: found.username,
      email: found.email,
      password: found.password,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
      // Add other fields if needed
    };
  }

  async updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.prisma.user.update({ where: { id }, data: user });
    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      password: updated.password,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      // Add other fields if needed
    };
  }
}
