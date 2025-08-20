import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtService as JwtServiceInterface } from '../interfaces/jwt.service';

@Injectable()
export class JwtService implements JwtServiceInterface {
  private readonly secret = process.env.JWT_SECRET || 'default_secret';
  private readonly expiresIn = '1d';

  sign(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (e) {
      return null;
    }
  }
}
