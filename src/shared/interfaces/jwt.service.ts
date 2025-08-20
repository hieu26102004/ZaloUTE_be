export interface JwtService {
  sign(payload: object): string;
  verify(token: string): any;
}
