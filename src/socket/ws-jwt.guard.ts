import { Injectable, Logger } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '../shared/infrastructure/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);
    if (!token) return false;
    const payload = this.jwtService.verify(token);
    if (!payload) return false;
    // Gán userId vào socket để các handler dùng
    (client as any).data = { userId: payload.sub, email: payload.email };
    return true;
  }

  private extractToken(client: Socket): string | null {
    // Lấy token từ query hoặc header
    if (client.handshake.query && client.handshake.query.token) {
      return String(client.handshake.query.token);
    }
    if (client.handshake.headers && client.handshake.headers.authorization) {
      const auth = client.handshake.headers.authorization;
      if (auth.startsWith('Bearer ')) {
        return auth.slice(7);
      }
    }
    return null;
  }
}
