import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { CompanyType } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: CompanyType, page: number = 1, limit: number = 25): Promise<PaginatedResponse<any>> {
    const where = type ? { type } : {};

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          phone: true,
          email: true,
          createdAt: true,
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        projects: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        account: dto.account,
        bank: dto.bank,
        bik: dto.bik,
        corrAccount: dto.corrAccount,
        inn: dto.inn,
        kpp: dto.kpp,
        ogrn: dto.ogrn,
        postalCode: dto.postalCode,
      },
    });

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        account: dto.account,
        bank: dto.bank,
        bik: dto.bik,
        corrAccount: dto.corrAccount,
        inn: dto.inn,
        kpp: dto.kpp,
        ogrn: dto.ogrn,
        postalCode: dto.postalCode,
      },
    });

    return updated;
  }

  async delete(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.prisma.company.delete({
      where: { id },
    });

    return { message: 'Company deleted successfully' };
  }
}
