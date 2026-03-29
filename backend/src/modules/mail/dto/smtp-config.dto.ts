import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateSmtpConfigDto {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsBoolean()
  @IsOptional()
  secure?: boolean = true;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEmail()
  fromEmail: string;

  @IsString()
  @IsOptional()
  fromName?: string = 'LenconDB';
}
