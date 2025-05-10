import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, password: hash },
    });
    const token = this.buildToken(user.id);
    return { user: { id: user.id, name: user.name }, token };
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
    if (!user) throw new UnauthorizedException('Неверные имя или пароль');
    const token = this.buildToken(user.id);
    return { user, token };
  }

  private buildToken(userId: string) {
    return this.jwt.sign({ sub: userId });
  }
}
