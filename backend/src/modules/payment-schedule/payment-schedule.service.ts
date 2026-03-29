import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentType } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class PaymentScheduleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Feature #337: Validate that project has cost and total payments don't exceed it.
   * Uses aggregate instead of findMany+reduce for efficiency.
   */
  private async validatePaymentAmount(
    projectId: string,
    newAmount: number,
    excludePaymentId?: string,
  ): Promise<void> {
    // Get project with cost
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { cost: true, name: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Feature #337: Project must have cost specified to add payments
    if (!project.cost || project.cost <= 0) {
      throw new BadRequestException(
        'Невозможно добавить платеж. У проекта не указана полная стоимость.',
      );
    }

    // Use aggregate to sum existing payments in a single query
    const aggregate = await this.prisma.paymentSchedule.aggregate({
      where: {
        projectId,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
      _sum: { amount: true },
    });

    const existingTotal = Number(aggregate._sum.amount ?? 0);
    const newTotal = existingTotal + newAmount;

    // Feature #337: Total payments cannot exceed project cost
    if (newTotal > Number(project.cost)) {
      throw new BadRequestException(
        `Сумма всех платежей (${newTotal.toFixed(2)}) превышает полную стоимость проекта (${Number(project.cost).toFixed(2)})`,
      );
    }
  }

  async findAll(projectId?: string, page: number = 1, limit: number = 25): Promise<PaginatedResponse<any>> {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const [data, total] = await Promise.all([
      this.prisma.paymentSchedule.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { expectedDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentSchedule.count({ where }),
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
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    return payment;
  }

  async create(data: {
    projectId: string;
    type: PaymentType;
    name: string;
    amount: number;
    percentage?: number;
    expectedDate: Date;
    actualDate?: Date;
    isPaid?: boolean;
    description?: string;
  }) {
    // Feature #337: Validate payment amount before creating
    await this.validatePaymentAmount(data.projectId, data.amount);

    return this.prisma.paymentSchedule.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        name: data.name,
        amount: data.amount,
        percentage: data.percentage,
        expectedDate: new Date(data.expectedDate),
        actualDate: data.actualDate ? new Date(data.actualDate) : null,
        isPaid: data.isPaid ?? false,
        description: data.description,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      type?: PaymentType;
      name?: string;
      amount?: number;
      percentage?: number;
      expectedDate?: Date;
      actualDate?: Date;
      isPaid?: boolean;
      description?: string;
    },
  ) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    // Feature #337: Validate payment amount if it's being changed
    if (data.amount !== undefined) {
      await this.validatePaymentAmount(payment.projectId, data.amount, id);
    }

    return this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        amount: data.amount,
        percentage: data.percentage,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        actualDate: data.actualDate ? new Date(data.actualDate) : undefined,
        isPaid: data.isPaid,
        description: data.description,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    await this.prisma.paymentSchedule.delete({
      where: { id },
    });

    return { message: 'Payment schedule deleted successfully' };
  }

  async markAsPaid(id: string, actualDate?: Date) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    return this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        isPaid: true,
        actualDate: actualDate ? new Date(actualDate) : new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
