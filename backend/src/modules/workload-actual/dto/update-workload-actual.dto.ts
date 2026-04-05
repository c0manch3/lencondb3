import { IsOptional, IsNumber, IsString, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class DistributionUpdateDto {
  @IsString()
  projectId: string;

  @IsNumber()
  @Min(0.5)
  @Max(24)
  hours: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkloadActualDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursWorked?: number;

  @IsOptional()
  @IsString()
  userText?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributionUpdateDto)
  distributions?: DistributionUpdateDto[];
}
