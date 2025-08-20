interface UserDoc {
  _id: any;
  username: string;
  email: string;
  password: string;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserRepository } from '../domain/repositories/user.repository';
import type { UserEntity } from '../domain/entities/user.entity';
import { User } from './user.schema';


@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}


  async createUser(user: Partial<UserEntity>): Promise<UserEntity> {
    if (!user.username || !user.email || !user.password) {
      throw new Error('Missing required fields: username, email, or password');
    }
    const created = await this.userModel.create({
      username: user.username,
      email: user.email,
      password: user.password,
      otp: user.otp,
      otpExpiresAt: user.otpExpiresAt,
    });
  const doc = created.toObject ? created.toObject() : created;
  const d = doc as unknown as UserDoc;
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }


  async findByEmail(email: string): Promise<UserEntity | null> {
    const found = await this.userModel.findOne({ email }).exec();
    if (!found) return null;
  const doc = found.toObject ? found.toObject() : found;
  const d = doc as unknown as UserDoc;
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.userModel.findByIdAndUpdate(id, user, { new: true }).exec();
    if (!updated) throw new Error('User not found');
  const doc = updated.toObject ? updated.toObject() : updated;
  const d = doc as unknown as UserDoc;
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
