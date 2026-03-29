import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CompanyFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;
}
