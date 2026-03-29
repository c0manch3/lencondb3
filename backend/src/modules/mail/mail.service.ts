import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService implements OnModuleInit {
  private encryptionKey: string;
  private inviteTemplate: string | null = null;
  private resetPasswordTemplate: string | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const rawKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');
    if (!rawKey) {
      console.warn(
        'WARNING: ENCRYPTION_MASTER_KEY not set. SMTP password encryption will not work properly.',
      );
      this.encryptionKey = '';
    } else {
      // Derive a deterministic 32-character key from the master key
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(rawKey)
        .digest('hex')
        .substring(0, 32);
    }
  }

  async onModuleInit() {
    await this.ensurePgcrypto();
  }

  /**
   * Ensure pgcrypto extension is enabled in PostgreSQL
   */
  private async ensurePgcrypto(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
      );
    } catch {
      // Silently catch -- pgcrypto may already be enabled
    }
  }

  /**
   * Encrypt SMTP password using PostgreSQL pgcrypto
   */
  async encryptPassword(password: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error(
        'Encryption key not configured. Set ENCRYPTION_MASTER_KEY environment variable.',
      );
    }

    const result = await this.prisma.$queryRaw<[{ encrypted: string }]>`
      SELECT encode(pgp_sym_encrypt(${password}, ${this.encryptionKey}), 'base64') as encrypted
    `;
    return result[0].encrypted;
  }

  /**
   * Decrypt SMTP password using PostgreSQL pgcrypto
   */
  async decryptPassword(encrypted: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error(
        'Encryption key not configured. Set ENCRYPTION_MASTER_KEY environment variable.',
      );
    }

    const result = await this.prisma.$queryRaw<[{ decrypted: string }]>`
      SELECT pgp_sym_decrypt(decode(${encrypted}, 'base64'), ${this.encryptionKey}) as decrypted
    `;
    return result[0].decrypted;
  }

  /**
   * Mask password for display (first 8 + '...' + last 4 chars)
   */
  private maskPassword(encrypted: string): string {
    if (encrypted.length <= 12) {
      return '***';
    }
    const first = encrypted.substring(0, 8);
    const last = encrypted.substring(encrypted.length - 4);
    return `${first}...${last}`;
  }

  /**
   * Get the active SMTP configuration with decrypted password.
   * Returns null if no active SMTP config exists.
   */
  async getActiveSmtpConfig(): Promise<{
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
  } | null> {
    const config = await this.prisma.smtpConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return null;
    }

    const password = await this.decryptPassword(config.passwordEncrypted);

    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      password,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    };
  }

  /**
   * Save (upsert) SMTP configuration.
   * Deactivates all existing configs, creates a new active one.
   */
  async saveSmtpConfig(dto: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password?: string;
    fromEmail: string;
    fromName: string;
  }) {
    let passwordEncrypted: string;

    if (dto.password && dto.password.length > 0) {
      passwordEncrypted = await this.encryptPassword(dto.password);
    } else {
      // No password provided — try to reuse existing active config's password
      const existingConfig = await this.prisma.smtpConfig.findFirst({
        where: { isActive: true },
      });
      if (!existingConfig) {
        throw new BadRequestException('Password is required for new SMTP configuration');
      }
      passwordEncrypted = existingConfig.passwordEncrypted;
    }

    // Deactivate all existing configs
    await this.prisma.smtpConfig.updateMany({
      data: { isActive: false },
    });

    // Create new active config
    const config = await this.prisma.smtpConfig.create({
      data: {
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        passwordEncrypted,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName,
        isActive: true,
      },
    });

    const { passwordEncrypted: _, ...safeConfig } = config;
    return {
      ...safeConfig,
      passwordMasked: this.maskPassword(config.passwordEncrypted),
    };
  }

  /**
   * Get SMTP config with masked password (safe for API responses).
   */
  async getSmtpConfigSafe() {
    const config = await this.prisma.smtpConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return null;
    }

    const { passwordEncrypted: _, ...safeConfig } = config;
    return {
      ...safeConfig,
      passwordMasked: this.maskPassword(config.passwordEncrypted),
    };
  }

  /**
   * Delete an SMTP configuration by ID.
   */
  async deleteSmtpConfig(id: string): Promise<void> {
    await this.prisma.smtpConfig.delete({
      where: { id },
    });
  }

  /**
   * Send an email via the active SMTP configuration.
   * Returns true on success, false on failure (logs error, does NOT throw).
   * Returns false gracefully when SMTP is not configured (copy-link fallback path).
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    const smtpConfig = await this.getActiveSmtpConfig();

    if (!smtpConfig) {
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
      });

      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Load and cache an HTML email template.
   */
  private loadTemplate(templateName: string): string {
    if (templateName === 'invite' && this.inviteTemplate) {
      return this.inviteTemplate;
    }
    if (templateName === 'reset-password' && this.resetPasswordTemplate) {
      return this.resetPasswordTemplate;
    }

    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    const template = fs.readFileSync(templatePath, 'utf-8');

    if (templateName === 'invite') {
      this.inviteTemplate = template;
    } else if (templateName === 'reset-password') {
      this.resetPasswordTemplate = template;
    }

    return template;
  }

  /**
   * Send an invite email to a new user.
   */
  async sendInviteEmail(
    user: { email: string; firstName: string },
    inviteUrl: string,
  ): Promise<boolean> {
    const template = this.loadTemplate('invite');
    const html = template
      .replace(/\{\{firstName\}\}/g, user.firstName)
      .replace(/\{\{inviteUrl\}\}/g, inviteUrl)
      .replace(/\{\{expiresHours\}\}/g, '24');

    return this.sendEmail(
      user.email,
      'Приглашение в LenconDB',
      html,
    );
  }

  /**
   * Send a password reset email.
   */
  async sendResetPasswordEmail(
    user: { email: string; firstName: string },
    resetUrl: string,
  ): Promise<boolean> {
    const template = this.loadTemplate('reset-password');
    const html = template
      .replace(/\{\{firstName\}\}/g, user.firstName)
      .replace(/\{\{resetUrl\}\}/g, resetUrl)
      .replace(/\{\{expiresHours\}\}/g, '24');

    return this.sendEmail(
      user.email,
      'Сброс пароля — LenconDB',
      html,
    );
  }

  /**
   * Send a test email to verify SMTP configuration works.
   */
  async sendTestEmail(toEmail: string): Promise<boolean> {
    return this.sendEmail(
      toEmail,
      'Тестовое письмо — LenconDB',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>SMTP настроен успешно</h2>
        <p>Это тестовое письмо подтверждает, что SMTP-конфигурация LenconDB работает корректно.</p>
      </div>`,
    );
  }
}
