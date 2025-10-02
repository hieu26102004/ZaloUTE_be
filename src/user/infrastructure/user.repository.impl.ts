interface UserDoc {
  _id: any;
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
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserRepository } from '../domain/repositories/user.repository';
import type { UserEntity } from '../domain/entities/user.entity';
import { User } from './user.schema';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async activateUser(email: String, otp: String): Promise<Partial<UserEntity>> {
    const user = await this.userModel.findOne({ email, otp }).exec();
    if (!user) throw new Error('Invalid email or OTP!');
    user.isActive = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await this.userModel.updateOne({ _id: user._id }, user).exec();
    return {
      id: user._id?.toString?.() ?? String(user._id),
      username: user.username,
      email: user.email,
      isActive: true,
    };
  }

  async createUser(user: Partial<UserEntity>): Promise<Partial<UserEntity>> {
    if (!user.username || !user.email || !user.password) {
      throw new Error('Missing required fields: username, email, or password');
    }

    const existingUser = await this.findByEmail(user.email);
    if (existingUser) throw new Error('User already exists');

    const created = await this.userModel.create({
      username: user.username,
      email: user.email,
      password: user.password,
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      phone: user.phone || '',
      isActive: false,
      otp: user.otp, // Sử dụng OTP được truyền vào
      otpExpiresAt: user.otpExpiresAt, // Sử dụng otpExpiresAt được truyền vào
    });
    const doc = created.toObject ? created.toObject() : created;
    const d = doc as unknown as UserDoc;
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      isActive: d.isActive,
      otp: d.otp, // Return OTP trong response
      otpExpiresAt: d.otpExpiresAt, // Return otpExpiresAt trong response
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const found = await this.userModel.findOne({ email }).exec();
    if (!found) return null;
    const doc = found.toObject ? found.toObject() : found;
    const d = doc as unknown as UserDoc & { isActive: boolean };
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      firstname: d.firstname,
      lastname: d.lastname,
      phone: d.phone,
      avatarUrl: d.avatarUrl,
      avatarPublicId: d.avatarPublicId,
      isActive: d.isActive,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const found = await this.userModel.findOne({ username }).exec();
    if (!found) return null;
    const doc = found.toObject ? found.toObject() : found;
    const d = doc as unknown as UserDoc & { isActive: boolean };
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      firstname: d.firstname,
      lastname: d.lastname,
      phone: d.phone,
      avatarUrl: d.avatarUrl,
      avatarPublicId: d.avatarPublicId,
      isActive: d.isActive,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const found = await this.userModel.findById(id).exec();
    if (!found) return null;
    const doc = found.toObject ? found.toObject() : found;
    const d = doc as unknown as UserDoc & { isActive: boolean };
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      firstname: d.firstname,
      lastname: d.lastname,
      phone: d.phone,
      avatarUrl: d.avatarUrl,
      avatarPublicId: d.avatarPublicId,
      isActive: d.isActive,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.userModel
      .findByIdAndUpdate(id, user, { new: true })
      .exec();
    if (!updated) throw new Error('User not found');
    const doc = updated.toObject ? updated.toObject() : updated;
    const d = doc as unknown as UserDoc & { isActive: boolean };
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      firstname: d.firstname,
      lastname: d.lastname,
      phone: d.phone,
      avatarUrl: d.avatarUrl,
      avatarPublicId: d.avatarPublicId,
      isActive: d.isActive,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async update(id: string, user: Partial<UserEntity>): Promise<UserEntity> {
    return this.updateUser(id, user);
  }

  async searchByEmail(email: string): Promise<UserEntity[]> {
    const users = await this.userModel
      .find({
        email: { $regex: email, $options: 'i' },
        isActive: true,
      })
      .limit(10)
      .exec();

    return users.map((user) => {
      const doc = user.toObject ? user.toObject() : user;
      const d = doc as unknown as UserDoc & { isActive: boolean };
      return {
        id: d._id?.toString?.() ?? String(d._id),
        username: d.username,
        email: d.email,
        password: d.password,
        firstname: d.firstname,
        lastname: d.lastname,
        phone: d.phone,
        avatarUrl: d.avatarUrl,
        avatarPublicId: d.avatarPublicId,
        isActive: d.isActive,
        otp: d.otp,
        otpExpiresAt: d.otpExpiresAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const found = await this.userModel.findOne({ phone }).exec();
    if (!found) return null;
    const doc = found.toObject ? found.toObject() : found;
    const d = doc as unknown as UserDoc & { isActive: boolean };
    return {
      id: d._id?.toString?.() ?? String(d._id),
      username: d.username,
      email: d.email,
      password: d.password,
      firstname: d.firstname,
      lastname: d.lastname,
      phone: d.phone,
      avatarUrl: d.avatarUrl,
      avatarPublicId: d.avatarPublicId,
      isActive: d.isActive,
      otp: d.otp,
      otpExpiresAt: d.otpExpiresAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
