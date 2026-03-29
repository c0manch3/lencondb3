import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InviteService } from './invite.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenType, InviteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('invite')
export class InviteController {
  constructor(
    private readonly inviteService: InviteService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Public endpoints (no auth guard) ───────────────────────────

  /**
   * Validate a token without consuming it.
   * Tries Invite type first, then PasswordReset.
   * Returns user firstName for greeting screen.
   */
  @Get('validate/:token')
  async validateToken(@Param('token') token: string) {
    // Try Invite type first
    try {
      const result = await this.inviteService.validateToken(
        token,
        TokenType.Invite,
      );
      return {
        valid: true,
        firstName: result.user.firstName,
        type: 'invite',
      };
    } catch {
      // Not an invite token — try password reset
    }

    // Try PasswordReset type
    try {
      const result = await this.inviteService.validateToken(
        token,
        TokenType.PasswordReset,
      );
      return {
        valid: true,
        firstName: result.user.firstName,
        type: 'reset',
      };
    } catch {
      // Neither type matched
    }

    return {
      valid: false,
      message: 'Ссылка истекла. Обратитесь к администратору',
    };
  }

  /**
   * Accept an invite — set password, activate user.
   */
  @Post('accept')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const { userId } = await this.inviteService.consumeToken(
      dto.token,
      TokenType.Invite,
    );
    await this.usersService.setPassword(userId, dto.password);
    return { success: true };
  }

  /**
   * Reset password via token.
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const { userId } = await this.inviteService.consumeToken(
      dto.token,
      TokenType.PasswordReset,
    );
    await this.usersService.setPassword(userId, dto.password);
    return { success: true };
  }

  // ─── Admin endpoints (JwtAuthGuard + AdminGuard) ────────────────

  /**
   * Create an invite for a new user.
   * Creates user with placeholder password, generates token, sends email.
   * Always returns inviteUrl so frontend can show "Copy link" regardless of email success.
   */
  @Post('create')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createInvite(@Body() dto: CreateInviteDto) {
    // Create user with Pending status and placeholder password
    const user = await this.usersService.createInvitedUser(dto);

    // Generate invite token and URL
    const { url: inviteUrl } = await this.inviteService.createToken(
      user.id,
      TokenType.Invite,
    );

    // Send invite email (returns false gracefully if SMTP not configured)
    const emailSent = await this.mailService.sendInviteEmail(
      { email: dto.email, firstName: dto.firstName },
      inviteUrl,
    );

    return { user, emailSent, inviteUrl };
  }

  /**
   * Resend invite for an existing user with Pending status.
   * Invalidates old token, generates new one, sends email.
   */
  @Post('resend/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resendInvite(@Param('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        inviteStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.inviteStatus !== InviteStatus.Pending) {
      throw new BadRequestException(
        'Can only resend invite to users with Pending status',
      );
    }

    // createToken invalidates old tokens internally
    const { url: inviteUrl } = await this.inviteService.createToken(
      userId,
      TokenType.Invite,
    );

    const emailSent = await this.mailService.sendInviteEmail(
      { email: user.email, firstName: user.firstName },
      inviteUrl,
    );

    return { emailSent, inviteUrl };
  }

  /**
   * Initiate password reset for an existing user (any inviteStatus).
   * Generates reset token, sends email.
   */
  @Post('initiate-reset/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async initiateReset(@Param('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { url: resetUrl } = await this.inviteService.createToken(
      userId,
      TokenType.PasswordReset,
    );

    const emailSent = await this.mailService.sendResetPasswordEmail(
      { email: user.email, firstName: user.firstName },
      resetUrl,
    );

    return { emailSent, resetUrl };
  }
}
