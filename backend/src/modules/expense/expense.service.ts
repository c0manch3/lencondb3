import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto } from './dto/expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: ExpenseFilterDto) {
    const { category, startDate, endDate, page = 1, limit = 25 } = filters;

    const where: any = { deletedAt: null };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
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
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.expense.create({
      data: {
        date: new Date(dto.date),
        amount: dto.amount,
        vatAmount: dto.vatAmount,
        category: dto.category,
        description: dto.description,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.vatAmount !== undefined && { vatAmount: dto.vatAmount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Expense deleted successfully' };
  }

  async findAllForExport(filters: ExpenseFilterDto) {
    const { category, startDate, endDate } = filters;

    const where: any = { deletedAt: null };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Cross-module query: aggregates overdue incoming payments from paymentSchedule,
   * grouped by project. Used for overdue payment notifications (sidebar badge + banner).
   * This lives in the expense (finance) module because it aggregates financial data
   * across expenses and incoming payments.
   */
  async getOverdueSummary() {
    const now = new Date();

    const grouped = await this.prisma.paymentSchedule.groupBy({
      by: ['projectId'],
      where: {
        isPaid: false,
        expectedDate: { lt: now },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    if (grouped.length === 0) {
      return { count: 0, totalAmount: 0, projects: [] };
    }

    const projectIds = grouped.map((g) => g.projectId);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });

    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));

    let totalCount = 0;
    let totalAmount = 0;

    const projectDetails = grouped.map((g) => {
      const overdueCount = g._count.id;
      const overdueAmount = g._sum.amount ?? 0;
      totalCount += overdueCount;
      totalAmount += overdueAmount;

      return {
        projectId: g.projectId,
        projectName: projectNameMap.get(g.projectId) ?? 'Unknown',
        overdueCount,
        overdueAmount,
      };
    });

    return {
      count: totalCount,
      totalAmount,
      projects: projectDetails,
    };
  }
}
