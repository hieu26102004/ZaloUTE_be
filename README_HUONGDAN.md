# ZaloUTE Backend

## Yêu cầu hệ thống
- Docker & Docker Compose
- Node.js (>= 16.x)
- Yarn hoặc npm

## Cài đặt và chạy bằng Docker

1. **Khởi động PostgreSQL bằng Docker Compose:**
   ```sh
   docker-compose up -d
   ```
   - PostgreSQL sẽ chạy ở cổng `5477` trên máy chủ.
   - Thông tin kết nối:
     - Host: `localhost`
     - Port: `5477`
     - Database: `ZaloUTE_DB`
     - User: `postgres`
     - Password: `postgres`

2. **Cài đặt dependencies:**
   ```sh
   yarn install
   # hoặc
   npm install
   ```

3. **Chạy migration cho database:**
   ```sh
   npx prisma migrate deploy
   ```

4. **Khởi động server:**
   ```sh
   yarn start:dev
   # hoặc
   npm run start:dev
   ```

## Cấu trúc thư mục chính
- `src/` - Mã nguồn backend (NestJS)
- `prisma/` - Cấu hình và migration cho Prisma ORM
- `docker-compose.yml` - Cấu hình dịch vụ PostgreSQL

## Một số lệnh hữu ích
- Dừng dịch vụ Docker:
  ```sh
  docker-compose down
  ```
- Xem log PostgreSQL:
  ```sh
  docker logs zalo_ute_postgres
  ```

## Liên hệ
- Liên hệ nhóm phát triển để được hỗ trợ thêm.
