import { IsString, IsOptional, IsNumber, IsDateString, Min, Max, Matches, ValidateIf } from 'class-validator';

// UUID regex pattern that accepts any UUID-like format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateWorkloadPlanDto {
  @Matches(UUID_REGEX, { message: 'userId must be a valid UUID format' })
  userId: string;

  @Matches(UUID_REGEX, { message: 'projectId must be a valid UUID format' })
  projectId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @ValidateIf((o) => o.hours !== null)
  @IsNumber()
  @Min(0)
  @Max(24)
  hours?: number | null;
}

export class UpdateWorkloadPlanDto {
  @Matches(UUID_REGEX, { message: 'projectId must be a valid UUID format' })
  @IsOptional()
  projectId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsOptional()
  @ValidateIf((o) => o.hours !== null)
  @IsNumber()
  @Min(0)
  @Max(24)
  hours?: number | null;
}
