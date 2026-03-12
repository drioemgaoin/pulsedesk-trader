import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = process.env['JWT_SECRET'];
        if (!secret) throw new Error('JWT_SECRET env var is required');
        return secret;
      })(),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub };
  }
}
