import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import { UserProfileDto, UpdateUserProfileDto } from '../dto/user.dto';

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, updateData: UpdateUserProfileDto): Promise<UserProfileDto> {
    // Kiểm tra user có tồn tại không
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra dữ liệu đầu vào
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    // Kiểm tra email mới nếu có thay đổi
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(updateData.email);
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    // Kiểm tra phone mới nếu có thay đổi
    if (updateData.phone && updateData.phone !== existingUser.phone) {
      const phoneExists = await this.userRepository.findByPhone(updateData.phone);
      if (phoneExists) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Tạo object cập nhật chỉ với các field được cung cấp
    const updateFields: Partial<UpdateUserProfileDto> = {};
    
    if (updateData.firstname !== undefined) {
      updateFields.firstname = updateData.firstname;
    }
    
    if (updateData.lastname !== undefined) {
      updateFields.lastname = updateData.lastname;
    }
    
    if (updateData.phone !== undefined) {
      updateFields.phone = updateData.phone;
    }

    if (updateData.email !== undefined) {
      updateFields.email = updateData.email;
    }

    // Cập nhật thông tin user
    const updatedUser = await this.userRepository.updateUser(userId, updateFields);

    // Trả về thông tin user đã cập nhật (không bao gồm password và OTP)
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
