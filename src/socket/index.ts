import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { messageHandler } from './handlers/message.handler';
import { authMiddleware } from './middlewares/auth.middleware';

export function setupSocket(server: HTTPServer) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.use(authMiddleware);

  io.on('connection', (socket: Socket) => {
    messageHandler(io, socket);
    // Thêm các handler khác nếu cần
  });

  return io;
}
