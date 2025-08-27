// Các hàm tiện ích cho socket (nếu cần)
export function getSocketUserId(socket: any): string | undefined {
  // TODO: Lấy userId từ socket (từ handshake hoặc decoded token)
  return socket.userId;
}
