import { Injectable, Logger } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '../shared/infrastructure/jwt.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      // Debug: log handshake basics for debugging handshake/upgrade issues
      try {
        const hs = (client as any).handshake || {};
        this.logger.debug(`Handshake url: ${String(hs.url || hs.pathname || '')}`);
        try {
          this.logger.debug(`Handshake query: ${JSON.stringify(hs.query || {})}`);
        } catch (e) {
          this.logger.debug('Handshake query: [unable to stringify]');
        }
        try {
          this.logger.debug(`Handshake auth: ${JSON.stringify(hs.auth || {})}`);
        } catch (e) {
          this.logger.debug('Handshake auth: [unable to stringify]');
        }
        this.logger.debug(`Handshake query keys: ${Object.keys(hs.query || {}).join(',')}`);
        this.logger.debug(`Handshake auth keys: ${Object.keys(hs.auth || {}).join(',')}`);
        this.logger.debug(`Authorization header present: ${Boolean(hs.headers?.authorization)}`);
      } catch (e) {
        this.logger.debug('Unable to stringify handshake for debug');
      }

      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn('No token provided');
        return false;
      }

      const payload = this.jwtService.verify(token);
      if (!payload) {
        this.logger.warn('Invalid token');
        return false;
      }

      // Gán userId vào socket để các handler dùng
      (client as any).data = { 
        userId: payload.sub, 
        email: payload.email 
      };
      
      this.logger.log(`User ${payload.sub} authenticated via WebSocket`);
      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
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
      this.logger.error('Error extracting token:', error);
      return null;
    }
  }
}
