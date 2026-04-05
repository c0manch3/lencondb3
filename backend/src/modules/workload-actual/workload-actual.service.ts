import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class WorkloadActualService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;

    // Filter actuals that have at least one distribution for the given project
    if (filters?.projectId) {
      where.distributions = {
        some: {
          projectId: filters.projectId,
        },
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) where.date.gte = new Date(filters.startDate);
      if (filters?.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.workloadActual.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          distributions: {
            include: {
              project: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workloadActual.count({ where }),
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
    const workload = await this.prisma.workloadActual.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        distributions: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!workload) {
      throw new NotFoundException('Workload actual not found');
    }

    return workload;
  }

  async findByUserAndDate(userId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.workloadActual.findUnique({
      where: {
        userId_date: {
          userId,
          date: startOfDay,
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        distributions: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async create(data: {
    userId: string;
    date: Date;
    hoursWorked: number;
    userText?: string;
    distributions?: { projectId: string; hours: number; description?: string }[];
  }) {
    const dateOnly = new Date(data.date);
    dateOnly.setHours(0, 0, 0, 0);

    // Check if entry already exists for this user on this date
    const existing = await this.prisma.workloadActual.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: dateOnly,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A workload entry already exists for this user on this date');
    }

    return this.prisma.workloadActual.create({
      data: {
        userId: data.userId,
        date: dateOnly,
        hoursWorked: data.hoursWorked,
        userText: data.userText,
        distributions: data.distributions
          ? {
              create: data.distributions.map((d) => ({
                project: {
                  connect: { id: d.projectId },
                },
                hours: d.hours,
                description: d.description || '',
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        distributions: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      hoursWorked?: number;
      userText?: string;
      distributions?: { projectId: string; hours: number; description?: string }[];
    },
  ) {
    // Validate total hours <= 24
    if (data.distributions) {
      const totalHours = data.distributions.reduce((sum, d) => sum + d.hours, 0);
      if (totalHours > 24) {
        throw new BadRequestException('Total distribution hours cannot exceed 24');
      }
    }

    if (data.hoursWorked !== undefined && data.hoursWorked > 24) {
      throw new BadRequestException('Hours worked cannot exceed 24');
    }

    const workload = await this.prisma.workloadActual.findUnique({
      where: { id },
    });

    if (!workload) {
      throw new NotFoundException('Workload actual not found');
    }

    // When distributions are provided, replace them atomically in a transaction
    if (data.distributions !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        // Delete all existing distributions for this actual
        await tx.projectWorkloadDistribution.deleteMany({
          where: { workloadActualId: id },
        });

        // Update the actual record and create new distributions
        return tx.workloadActual.update({
          where: { id },
          data: {
            hoursWorked: data.hoursWorked,
            userText: data.userText,
            distributions: {
              create: data.distributions!.map((d) => ({
                project: { connect: { id: d.projectId } },
                hours: d.hours,
                description: d.description || '',
              })),
            },
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
            distributions: {
              include: {
                project: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        });
      });
    }

    // Simple update without distributions
    return this.prisma.workloadActual.update({
      where: { id },
      data: {
        hoursWorked: data.hoursWorked,
        userText: data.userText,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        distributions: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async delete(id: string) {
    const workload = await this.prisma.workloadActual.findUnique({
      where: { id },
    });

    if (!workload) {
      throw new NotFoundException('Workload actual not found');
    }

    await this.prisma.workloadActual.delete({
      where: { id },
    });

    return { message: 'Workload actual deleted successfully' };
  }

  // Distribution management
  async addDistribution(
    workloadActualId: string,
    data: {
      projectId: string;
      hours: number;
      description?: string;
    },
  ) {
    const workload = await this.prisma.workloadActual.findUnique({
      where: { id: workloadActualId },
    });

    if (!workload) {
      throw new NotFoundException('Workload actual not found');
    }

    return this.prisma.projectWorkloadDistribution.create({
      data: {
        workloadActualId,
        projectId: data.projectId,
        hours: data.hours,
        description: data.description || '',
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findDistribution(distributionId: string) {
    const distribution = await this.prisma.projectWorkloadDistribution.findUnique({
      where: { id: distributionId },
      include: {
        workloadActual: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!distribution) {
      throw new NotFoundException('Distribution not found');
    }

    return distribution;
  }

  async removeDistribution(distributionId: string) {
    const distribution = await this.prisma.projectWorkloadDistribution.findUnique({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new NotFoundException('Distribution not found');
    }

    await this.prisma.projectWorkloadDistribution.delete({
      where: { id: distributionId },
    });

    return { message: 'Distribution deleted successfully' };
  }

  // Get user's workload for a date range (for employee view)
  async getMyWorkload(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.workloadActual.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        distributions: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}
