TODO Triển khai chức năng nhắn tin realtime (Socket.IO) chuẩn clean, kết hợp shared
1. Cấu trúc lại thư mục dự án
src/
  shared/
    models/
    utils/
    services/
    ...
  socket/
    index.js
    constants.js
    middlewares/
      auth.middleware.js
    handlers/
      message.handler.js
      user.handler.js
    utils/
      socket.utils.js
2. Cài đặt Socket.IO
Đã cài
3. Tạo file khởi tạo socket
src/socket/index.js: Khởi tạo socket, đăng ký middleware, handler.
4. Tạo middleware xác thực socket
src/socket/middlewares/auth.middleware.js:
Sử dụng hàm xác thực từ shared (ví dụ: verifyToken).
5. Tạo các handler cho socket
src/socket/handlers/message.handler.js:
Xử lý gửi/nhận tin nhắn, lưu vào DB (dùng model/service từ shared).
src/socket/handlers/user.handler.js:
(Nếu cần) Xử lý các sự kiện liên quan user.
6. Định nghĩa các sự kiện socket
src/socket/constants.js:
Đặt tên các sự kiện như SEND_MESSAGE, RECEIVE_MESSAGE, ...
7. Tận dụng shared
Import các model, service, utils từ shared vào handler/middleware của socket.
8. Tích hợp socket vào server
Sửa file main.js hoặc server.js để gọi setupSocket(server).
9. Viết utils cho socket (nếu cần)
src/socket/utils/socket.utils.js:
Các hàm tiện ích cho socket.
10. Kiểm thử
Test kết nối, gửi/nhận tin nhắn realtime, xác thực socket.
Ghi chú:

Đảm bảo không trộn lẫn logic HTTP và socket.
Tận dụng tối đa các thành phần dùng chung trong shared.
Tách biệt rõ ràng middleware, handler, utils cho socket.