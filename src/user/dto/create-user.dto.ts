import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Имя должно содержать минимум 3 символа' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Пароль должно содержать минимум 3 символа' })
  password!: string;
}
