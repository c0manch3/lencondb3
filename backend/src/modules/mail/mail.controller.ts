import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSmtpConfigDto } from './dto/smtp-config.dto';

@Controller('smtp')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Get active SMTP configuration with masked password.
   * Returns null if not configured.
   */
  @Get('config')
  async getConfig() {
    return this.mailService.getSmtpConfigSafe();
  }

  /**
   * Save (upsert) SMTP configuration.
   * Deactivates existing configs, creates new active one.
   * Returns config with masked password.
   */
  @Post('config')
  async saveConfig(@Body() dto: CreateSmtpConfigDto) {
    return this.mailService.saveSmtpConfig({
      host: dto.host,
      port: dto.port,
      secure: dto.secure ?? true,
      username: dto.username,
      password: dto.password,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName ?? 'LenconDB',
    });
  }

  /**
   * Send test email to admin's own email address.
   */
  @Post('test')
  async sendTestEmail(@CurrentUser('email') email: string) {
    const success = await this.mailService.sendTestEmail(email);

    if (success) {
      return {
        success: true,
        message: `Тестовое письмо отправлено на ${email}`,
      };
    }

    return {
      success: false,
      message:
        'Не удалось отправить тестовое письмо. Проверьте настройки SMTP.',
    };
  }

  /**
   * Delete SMTP configuration by ID.
   */
  @Delete('config/:id')
  async deleteConfig(@Param('id') id: string) {
    await this.mailService.deleteSmtpConfig(id);
    return { message: 'SMTP configuration deleted' };
  }
}
