
# ZaloUTE Backend

## Yêu cầu hệ thống
- Docker & Docker Compose
- Node.js (>= 16.x)
- Yarn hoặc npm

## Cài đặt và chạy bằng Docker

1. **Khởi động MongoDB bằng Docker Compose:**
    ```sh
    docker-compose up -d
    ```
    - MongoDB sẽ chạy ở cổng `27017` trên máy chủ.
    - Thông tin kết nối:
       - Host: `localhost`
       - Port: `27017`
       - Database: `zalo_ute`
       - User: `root`
       - Password: `example`

2. **Cài đặt dependencies:**
    ```sh
    yarn install
    # hoặc
    npm install
    ```

3. **Cấu hình biến môi trường:**
    - Tạo file `.env` (nếu chưa có) và thêm dòng sau:
       ```env
       MONGO_URI="mongodb://root:example@localhost:27017/zalo_ute?authSource=admin"
       ```

4. **Khởi động server:**
    ```sh
    yarn start:dev
    # hoặc
    npm run start:dev
    ```

## Cấu trúc thư mục chính
- `src/` - Mã nguồn backend (NestJS)
- `docker-compose.yml` - Cấu hình dịch vụ MongoDB

## Một số lệnh hữu ích
- Dừng dịch vụ Docker:
   ```sh
   docker-compose down
   ```
- Xem log MongoDB:
   ```sh
   docker logs zalo_ute_mongo
   ```

## Liên hệ
- Liên hệ nhóm phát triển để được hỗ trợ thêm.
