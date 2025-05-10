import { IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Имя должно быть не короче 3 символов' })
  name!: string;

  @IsString()
  @MinLength(3, { message: 'Пароль должен быть не короче 3 символов' })
  password!: string;
}
