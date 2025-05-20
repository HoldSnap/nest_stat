// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким именем уже существует');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { name: dto.name, password: hash },
      });
      // включаем name в JWT
      const token = this.buildToken({ id: user.id, name: user.name });
      return { user: { id: user.id, name: user.name }, token };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким именем уже существует',
        );
      }
      throw e;
    }
  }

  async validateUser(name: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { name } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      return { id: user.id, name: user.name };
    }
    return null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.name, dto.password);
    if (!user) {
      throw new UnauthorizedException('Неверные имя или пароль');
    }
    // включаем name в JWT
    const token = this.buildToken({ id: user.id, name: user.name });
    return { user, token };
  }

  private buildToken(user: { id: string; name: string }): string {
    // payload: { sub: user.id, name: user.name }
    return this.jwt.sign({ sub: user.id, name: user.name });
  }
}
