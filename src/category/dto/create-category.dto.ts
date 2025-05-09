import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;
}
