import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { CloudinaryService } from '../infrastructure/cloudinary.service';
import { UploadFileDto, UploadFileResponseDto } from '../dto/upload.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('file')
  @ApiOperation({
    summary: 'Upload any file type',
    description:
      'Upload images, videos, documents and other files to Cloudinary',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or missing data',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 50MB limit');
      }

      // Get folder from body or use default
      const folder = uploadDto.folder || 'chat-files';

      // Determine resource type based on MIME type
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      }

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadAnyFile(
        file,
        folder,
        resourceType,
      );

      return {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        folder: folder,
      };
    } catch (error) {
      console.error('Upload error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Upload failed: ' + (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('image')
  @ApiOperation({
    summary: 'Upload image with optimization',
    description: 'Upload and optimize images for chat',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
    type: UploadFileResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    try {
      // Validate image size (10MB max for images)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('Image size exceeds 10MB limit');
      }

      const folder = uploadDto.folder || 'chat-images';

      // Use existing uploadImage method with optimization
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        folder,
      );

      return {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        folder: folder,
      };
    } catch (error) {
      console.error('Image upload error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Image upload failed: ' + (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload and optimize user avatar image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    type: UploadFileResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Avatar must be an image');
    }

    try {
      // Validate avatar size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('Avatar size exceeds 5MB limit');
      }

      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'avatars',
      );

      return {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        folder: 'avatars',
      };
    } catch (error) {
      console.error('Avatar upload error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Avatar upload failed: ' + (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
