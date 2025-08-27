import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../constants';

export function messageHandler(io: Server, socket: Socket) {
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => {
    // TODO: Xử lý gửi tin nhắn, lưu DB, emit lại cho người nhận
    // Ví dụ:
    // io.to(data.receiverId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, data);
  });
}
