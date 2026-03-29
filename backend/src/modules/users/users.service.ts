import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateUserDto } from './dto/auth.dto';
import { CreateInviteDto } from '../invite/dto/create-invite.dto';
import { UserRole, InviteStatus } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.inviteStatus === InviteStatus.Pending) {
      throw new UnauthorizedException('Account is not yet activated. Please use your invite link to set a password.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        telegramId: user.telegramId ? user.telegramId.toString() : undefined,
        salary: user.salary ? Number(user.salary) : undefined,
        dateBirth: user.dateBirth?.toISOString(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || UserRole.Employee,
        salary: dto.salary,
        dateBirth: dto.dateBirth ? new Date(dto.dateBirth) : new Date(),
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      salary: user.salary ? Number(user.salary) : undefined,
    };
  }

  /**
   * Create a user via the invite flow (no password — placeholder hash).
   * Same uniqueness checks as register.
   */
  async createInvitedUser(dto: CreateInviteDto) {
    const whereConditions: any[] = [{ email: dto.email }];
    if (dto.phone) {
      whereConditions.push({ phone: dto.phone });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: whereConditions },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Random placeholder password — matches no known input
    const placeholderHash = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      10,
    );

    // Generate unique placeholder phone if not provided (phone column is NOT nullable + unique)
    const phone = dto.phone || `no-phone-${crypto.randomBytes(4).toString('hex')}`;

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone,
        passwordHash: placeholderHash,
        role: dto.role || UserRole.Employee,
        salary: dto.salary,
        dateBirth: dto.dateBirth ? new Date(dto.dateBirth) : new Date(),
        inviteStatus: InviteStatus.Pending,
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      inviteStatus: user.inviteStatus,
      salary: user.salary ? Number(user.salary) : undefined,
    };
  }

  /**
   * Set password for a user (invite acceptance or password reset).
   * Hashes the new password, sets inviteStatus to Active, and deletes all refresh tokens.
   */
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        inviteStatus: InviteStatus.Active,
      },
    });

    // Invalidate all existing refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Invalidate all refresh tokens stored in database
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };
  }

  async validateToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  async findAll(page: number = 1, limit: number = 25): Promise<PaginatedResponse<any>> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          telegramId: true,
          salary: true,
          dateBirth: true,
          createdAt: true,
          inviteStatus: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    const data = users.map((user) => ({
      ...user,
      telegramId: user.telegramId ? user.telegramId.toString() : undefined,
      salary: user.salary ? Number(user.salary) : undefined,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        telegramId: true,
        salary: true,
        dateBirth: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegramId: user.telegramId ? user.telegramId.toString() : undefined,
      salary: user.salary ? Number(user.salary) : undefined,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert telegramId to BigInt if provided
    const updateData: any = { ...dto };
    if (dto.telegramId !== undefined) {
      updateData.telegramId = dto.telegramId ? BigInt(dto.telegramId) : null;
    }
    if (dto.dateBirth !== undefined) {
      updateData.dateBirth = new Date(dto.dateBirth);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        telegramId: true,
        salary: true,
        dateBirth: true,
      },
    });

    return {
      ...updated,
      telegramId: updated.telegramId ? updated.telegramId.toString() : undefined,
      salary: updated.salary ? Number(updated.salary) : undefined,
    };
  }

  async delete(id: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step 2: Self-delete protection
    if (id === currentUserId) {
      throw new ConflictException('Cannot delete your own account');
    }

    // Delete all related records in a transaction
    try {
      await this.prisma.$transaction(async (tx) => {
        // Last-admin guard (inside transaction for consistency)
        if (user.role === UserRole.Admin) {
          const adminCount = await tx.user.count({ where: { role: UserRole.Admin } });
          if (adminCount <= 1) {
            throw new ConflictException('Cannot delete the last admin user');
          }
        }

        // 1. Delete refresh tokens
        await tx.refreshToken.deleteMany({ where: { userId: id } });

        // 2-4. Delete workload actuals and their distributions
        const workloadActuals = await tx.workloadActual.findMany({
          where: { userId: id },
          select: { id: true },
        });
        const workloadActualIds = workloadActuals.map((wa) => wa.id);

        if (workloadActualIds.length > 0) {
          await tx.projectWorkloadDistribution.deleteMany({
            where: { workloadActualId: { in: workloadActualIds } },
          });
          await tx.workloadActual.deleteMany({ where: { userId: id } });
        }

        // 5. Delete workload plans (where user is the employee)
        await tx.workloadPlan.deleteMany({ where: { userId: id } });

        // 6. Delete workload plans where user is the manager
        await tx.workloadPlan.deleteMany({ where: { managerId: id } });

        // 7. Remove user from project assignments
        await tx.projectUser.deleteMany({ where: { userId: id } });

        // 8. Update projects where user is manager (set managerId to null)
        await tx.project.updateMany({
          where: { managerId: id },
          data: { managerId: null },
        });

        // 9. Delete employee proposals
        await tx.employeeProposal.deleteMany({ where: { userId: id } });

        // 10. Delete chat logs
        await tx.lenconnectChatLog.deleteMany({ where: { userId: id } });

        // 11. Delete expenses (hard delete — including soft-deleted)
        await tx.expense.deleteMany({ where: { createdById: id } });

        // 12. Delete the user (InviteToken auto-cascades)
        await tx.user.delete({ where: { id } });
      }, {
        maxWait: 10000,
        timeout: 30000,
      });
    } catch (error) {
      // Re-throw known HTTP exceptions (ConflictException from last-admin guard, etc.)
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      // Handle specific Prisma errors
      if (error?.code === 'P2025') {
        throw new NotFoundException('User has already been deleted');
      }
      if (error?.code === 'P2003') {
        this.logger.error(`FK constraint violation deleting user ${id}: ${error.meta?.field_name}`, error.stack);
        throw new InternalServerErrorException(
          'Cannot delete user: related data still exists. Please contact support.',
        );
      }
      this.logger.error(`Failed to delete user ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to delete user. Please try again or contact support.',
      );
    }

    return { message: 'User deleted successfully' };
  }

  async getAvailableEmployees(date: Date) {
    // Get all employees who don't have workload planned for this date
    const employees = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.Employee, UserRole.Manager] },
        workloadPlans: {
          none: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return employees;
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900, // 15 minutes in seconds
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800, // 7 days in seconds
    });

    return { accessToken, refreshToken };
  }
}
