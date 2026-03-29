import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LenconnectChatLogService } from './lenconnect-chat-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { ChatRequestType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('lenconnect-chat-logs')
@UseGuards(JwtAuthGuard, AdminGuard) // All routes require Admin authentication
export class LenconnectChatLogController {
  constructor(private readonly chatLogService: LenconnectChatLogService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.chatLogService.findAll(pagination.page, pagination.limit);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.chatLogService.findOne(uuid);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatLogService.findByUser(userId, pagination.page, pagination.limit);
  }

  @Get('user/:userId/:requestType')
  async findByUserAndType(
    @Param('userId') userId: string,
    @Param('requestType') requestType: ChatRequestType,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatLogService.findByUserAndType(userId, requestType, pagination.page, pagination.limit);
  }
}
