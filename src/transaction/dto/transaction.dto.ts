import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum CategoryTypeDto {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class TransactionDto {
  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string; // ISO string, e.g. "2025-05-10"

  @IsOptional()
  @IsString()
  comment?: string;

  @IsString()
  categoryName!: string;

  @IsEnum(CategoryTypeDto)
  categoryType!: CategoryTypeDto;
}
