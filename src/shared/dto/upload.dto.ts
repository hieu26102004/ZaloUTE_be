import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Folder to store the file in',
    default: 'chat-files',
  })
  @IsString()
  @IsOptional()
  folder?: string = 'chat-files';
}

export class UploadFileResponseDto {
  @ApiProperty({ description: 'Public URL of the uploaded file' })
  url: string;

  @ApiProperty({ description: 'Cloudinary public ID' })
  publicId: string;

  @ApiProperty({ description: 'Original file name' })
  fileName: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'MIME type of the file' })
  fileType: string;

  @ApiProperty({ description: 'Folder where file is stored' })
  folder: string;
}
