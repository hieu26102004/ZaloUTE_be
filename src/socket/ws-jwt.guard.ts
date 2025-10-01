import { Injectable, Logger } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '../shared/infrastructure/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractToken(client);
      
      console.log('🛡️ WsJwtGuard: Processing connection', client.id);
      console.log('🔑 WsJwtGuard: Token found:', !!token);
      
      if (!token) {
        console.log('❌ WsJwtGuard: No token provided');
        return false;
      }

      const payload = this.jwtService.verify(token);
      if (!payload) {
        console.log('❌ WsJwtGuard: Invalid token');
        return false;
      }

      // Gán user data vào socket để các handler dùng (giống format CallGateway expect)
      (client as any).data = { 
        user: {
          userId: payload.sub, 
          email: payload.email,
          ...payload
        }
      };
      
      console.log('✅ WsJwtGuard: Auth successful for user:', payload.sub);
      return true;
    } catch (error) {
      console.log('❌ WsJwtGuard: Error:', error.message);
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    try {
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
      
      // Also check auth from handshake auth object
      if (client.handshake.auth && client.handshake.auth.token) {
        return client.handshake.auth.token;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}
