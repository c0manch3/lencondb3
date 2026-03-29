import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Provides a read-only Prisma client that blocks all write operations
 * Used by AI query validator to ensure AI can only read data
 */
@Injectable()
export class PrismaReadonlyService {
  private readonlyClient: any;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a read-only Prisma client that throws on write operations
   */
  getReadonlyClient() {
    if (this.readonlyClient) {
      return this.readonlyClient;
    }

    const errorMessage =
      'Write operations not allowed. AI queries are read-only. / Операции записи запрещены. AI запросы только на чтение.';

    // Create extended client that blocks write operations
    this.readonlyClient = this.prisma.$extends({
      query: {
        $allModels: {
          async create() {
            throw new ForbiddenException(errorMessage);
          },
          async createMany() {
            throw new ForbiddenException(errorMessage);
          },
          async createManyAndReturn() {
            throw new ForbiddenException(errorMessage);
          },
          async update() {
            throw new ForbiddenException(errorMessage);
          },
          async updateMany() {
            throw new ForbiddenException(errorMessage);
          },
          async upsert() {
            throw new ForbiddenException(errorMessage);
          },
          async delete() {
            throw new ForbiddenException(errorMessage);
          },
          async deleteMany() {
            throw new ForbiddenException(errorMessage);
          },
        },
      },
    });

    return this.readonlyClient;
  }
}
