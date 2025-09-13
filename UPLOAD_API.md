# Upload API Documentation

## Overview

API endpoints để upload file (images, videos, documents) lên Cloudinary.

## Base URL

```
http://localhost:8080/upload
```

## Endpoints

### 1. Upload Any File

**POST** `/upload/file`

Upload bất kỳ loại file nào (image, video, document).

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file` (required): File to upload
  - `folder` (optional): Folder name on Cloudinary (default: "chat-files")

**Example using curl:**

```bash
curl -X POST \
  http://localhost:8080/upload/file \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/file.pdf" \
  -F "folder=documents"
```

**Example using JavaScript/Axios:**

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'chat-files');

const response = await axios.post('/upload/file', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

**Response:**

```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/chat-files/filename.jpg",
  "publicId": "chat-files/filename",
  "fileName": "original-filename.jpg",
  "fileSize": 1024000,
  "fileType": "image/jpeg",
  "folder": "chat-files"
}
```

### 2. Upload Image with Optimization

**POST** `/upload/image`

Upload và tối ưu hóa hình ảnh.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file` (required): Image file to upload
  - `folder` (optional): Folder name (default: "chat-images")

**Response:**
Same as `/upload/file`

### 3. Upload Avatar

**POST** `/upload/avatar`

Upload avatar cho user với tối ưu hóa đặc biệt.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file` (required): Image file for avatar

**Response:**
Same as `/upload/file` with `folder: "avatars"`

## File Limits

| Endpoint         | Max File Size | Allowed Types |
| ---------------- | ------------- | ------------- |
| `/upload/file`   | 50MB          | All types     |
| `/upload/image`  | 10MB          | Images only   |
| `/upload/avatar` | 5MB           | Images only   |

## Error Responses

**400 Bad Request:**

```json
{
  "statusCode": 400,
  "message": "No file uploaded"
}
```

**400 Bad Request (File too large):**

```json
{
  "statusCode": 400,
  "message": "File size exceeds 50MB limit"
}
```

**500 Internal Server Error:**

```json
{
  "statusCode": 500,
  "message": "Upload failed: Cloudinary error message"
}
```

## Frontend Integration

Trong frontend, service đã được tạo sẵn:

```typescript
import uploadService from '@/infrastructure/http/uploadService';

// Upload single file
const result = await uploadService.uploadFile(
  file,
  'chat-files',
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  },
);

// Upload image
const imageResult = await uploadService.uploadImage(imageFile, 'chat-images');

// Upload video
const videoResult = await uploadService.uploadVideo(videoFile, 'chat-videos');
```

## Environment Variables

Đảm bảo có config trong `.env`:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
