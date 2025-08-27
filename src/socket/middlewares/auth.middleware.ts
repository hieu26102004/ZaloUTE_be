import { Socket } from 'socket.io';
import { NextFunction } from 'express';
// import { verifyToken } from '../../shared/utils/jwt'; // Sử dụng hàm xác thực từ shared

export function authMiddleware(socket: Socket, next: NextFunction) {
  // TODO: Xác thực user từ token (lấy từ socket.handshake.auth hoặc socket.handshake.headers)
  // const token = socket.handshake.auth?.token;
  // if (verifyToken(token)) {
  //   return next();
  // }
  // return next(new Error('Authentication error'));
  next(); // Tạm cho qua, sẽ bổ sung sau
}
