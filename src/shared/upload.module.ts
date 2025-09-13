import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { UploadController } from './controllers/upload.controller';
import { CloudinaryService } from './infrastructure/cloudinary.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB
        },
        fileFilter: (req, file, callback) => {
          // Allow all file types for now, validation will be done in controller
          callback(null, true);
        },
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadModule {}
