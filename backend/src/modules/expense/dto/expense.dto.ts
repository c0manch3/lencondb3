import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatAmount?: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateExpenseDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  vatAmount?: number;

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ExpenseFilterDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number = 25;
}
