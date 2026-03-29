import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestType } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class LenconnectChatLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 25): Promise<PaginatedResponse<any>> {
    const [data, total] = await Promise.all([
      this.prisma.lenconnectChatLog.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lenconnectChatLog.count(),
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
    const log = await this.prisma.lenconnectChatLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Chat log not found');
    }

    return log;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 25): Promise<PaginatedResponse<any>> {
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.lenconnectChatLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lenconnectChatLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUserAndType(
    userId: string,
    requestType: ChatRequestType,
    page: number = 1,
    limit: number = 25,
  ): Promise<PaginatedResponse<any>> {
    const where = { userId, requestType };

    const [data, total] = await Promise.all([
      this.prisma.lenconnectChatLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lenconnectChatLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
