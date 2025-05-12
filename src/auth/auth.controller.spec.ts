import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;
  let res: Response;
  let req: Request;

  beforeEach(() => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as AuthService;
    controller = new AuthController(service);

    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    req = {
      user: { id: 'test-user' },
    } as unknown as Request;
  });

  it('should call authService.register with DTO', async () => {
    const dto: RegisterDto = { name: 'user', password: 'pass' } as any;
    const user = { id: 'u1' };
    const token = 'token123';
    (service.register as jest.Mock).mockResolvedValue({ user, token });

    await controller.register(dto, res);

    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('should set cookie on register with correct options', async () => {
    const dto: RegisterDto = { name: 'user', password: 'pass' } as any;
    const user = { id: 'u1' };
    const token = 'token123';
    (service.register as jest.Mock).mockResolvedValue({ user, token });

    await controller.register(dto, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'Authentication',
      token,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      }),
    );
  });

  it('should return only user from register', async () => {
    const dto: RegisterDto = { name: 'user', password: 'pass' } as any;
    const user = { id: 'u1', name: 'user' };
    const token = 'token123';
    (service.register as jest.Mock).mockResolvedValue({ user, token });

    const result = await controller.register(dto, res);

    expect(result).toEqual({ user });
  });

  it('should call authService.login with DTO', async () => {
    const dto: LoginDto = { name: 'user', password: 'pass' };
    const user = { id: 'u2' };
    const token = 'tok456';
    (service.login as jest.Mock).mockResolvedValue({ user, token });

    await controller.login(dto, res);

    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('should set cookie on login with correct options', async () => {
    const dto: LoginDto = { name: 'user', password: 'pass' };
    const user = { id: 'u2' };
    const token = 'tok456';
    (service.login as jest.Mock).mockResolvedValue({ user, token });

    await controller.login(dto, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'Authentication',
      token,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      }),
    );
  });

  it('should return only user from login', async () => {
    const dto: LoginDto = { name: 'user', password: 'pass' };
    const user = { id: 'u2', name: 'user' };
    const token = 'tok456';
    (service.login as jest.Mock).mockResolvedValue({ user, token });

    const result = await controller.login(dto, res);

    expect(result).toEqual({ user });
  });

  it('getProfile should return req.user', () => {
    const result = controller.getProfile(req);
    expect(result).toBe(req.user);
  });

  it('logout should clear cookie and return success', () => {
    const result = controller.logout(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      'Authentication',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('should have JwtAuthGuard on getProfile and logout', () => {
    const profileGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.getProfile,
    );
    const logoutGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.logout,
    );
    expect(profileGuards).toContain(JwtAuthGuard);
    expect(logoutGuards).toContain(JwtAuthGuard);
  });
});
