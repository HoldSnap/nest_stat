// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.Authentication, // или из заголовка
      ]),
      secretOrKey: jwtConstants.accessSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}
