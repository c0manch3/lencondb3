import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class InviteService {
  private frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';
  }

  /**
   * Create a new invite/reset token for a user.
   * Invalidates any existing unused tokens of the same type for this user.
   * Returns the raw token (not the hash) for inclusion in the invite URL.
   */
  async createToken(
    userId: string,
    type: TokenType,
  ): Promise<{ rawToken: string; url: string }> {
    // Invalidate existing unused tokens of same type for this user
    await this.prisma.inviteToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Store SHA-256 hash in the database
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Create token with 24h expiry
    await this.prisma.inviteToken.create({
      data: {
        userId,
        tokenHash,
        type,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Construct URL based on token type
    const url =
      type === TokenType.Invite
        ? `${this.frontendUrl}/invite/${rawToken}`
        : `${this.frontendUrl}/reset-password/${rawToken}`;

    return { rawToken, url };
  }

  /**
   * Validate a token without consuming it (read-only).
   * Used by the GET validate endpoint to check if token is still valid.
   * Throws BadRequestException if token is invalid, expired, or already used.
   */
  async validateToken(
    rawToken: string,
    expectedType: TokenType,
  ): Promise<{
    userId: string;
    user: { firstName: string; lastName: string; email: string };
  }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const token = await this.prisma.inviteToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!token) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    if (token.type !== expectedType) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    if (token.usedAt !== null) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    return {
      userId: token.userId,
      user: {
        firstName: token.user.firstName,
        lastName: token.user.lastName,
        email: token.user.email,
      },
    };
  }

  /**
   * Atomically validate and consume a token.
   * Uses updateMany with WHERE guards to prevent race conditions on double-use.
   * Throws BadRequestException if token cannot be consumed (invalid, expired, already used).
   */
  async consumeToken(
    rawToken: string,
    expectedType: TokenType,
  ): Promise<{ userId: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Atomically mark as used — only succeeds if token exists, correct type,
    // not yet used, and not expired
    const result = await this.prisma.inviteToken.updateMany({
      where: {
        tokenHash,
        type: expectedType,
        usedAt: null,
        expiresAt: {
          gte: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    // Fetch the token to get the userId
    const token = await this.prisma.inviteToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    if (!token) {
      throw new BadRequestException(
        'Ссылка истекла. Обратитесь к администратору',
      );
    }

    return { userId: token.userId };
  }
}
