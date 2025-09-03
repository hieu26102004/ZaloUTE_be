import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.token';
import { CloudinaryService } from '../../../shared/infrastructure/cloudinary.service';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async execute(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; avatarUrl: string }> {
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File phải là hình ảnh');
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Kích thước file không được vượt quá 5MB');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    try {
      // Upload new avatar to Cloudinary (replace old one if exists)
      const uploadResult = await this.cloudinaryService.replaceImage(
        user.avatarPublicId || null,
        file,
        'avatars',
      );

      // Update user with new avatar URL and public ID
      const updatedUser = await this.userRepository.update(userId, {
        avatarUrl: uploadResult.url,
        avatarPublicId: uploadResult.publicId,
      });

      return {
        message: 'Cập nhật avatar thành công',
        avatarUrl: uploadResult.url,
      };
    } catch (error) {
      throw new Error(`Upload avatar thất bại: ${error.message}`);
    }
  }
}
