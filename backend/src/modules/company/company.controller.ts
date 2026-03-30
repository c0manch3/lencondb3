import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';
import { CompanyType } from '@prisma/client';
import { CompanyFilterDto } from './dto/company-filter.dto';

@Controller('company')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async findAll(@Query() filters: CompanyFilterDto) {
    return this.companyService.findAll(
      filters.type as CompanyType | undefined,
      filters.page,
      filters.limit,
    );
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.companyService.findOne(uuid);
  }

  @Post('create')
  @UseGuards(ManagerGuard)
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Patch(':uuid')
  @UseGuards(ManagerGuard)
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(uuid, dto);
  }

  @Delete(':uuid')
  @UseGuards(ManagerGuard)
  async delete(@Param('uuid') uuid: string) {
    return this.companyService.delete(uuid);
  }
}
