import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WorkloadActualService } from './workload-actual.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkloadActualFilterDto } from './dto/workload-actual-filter.dto';
import { UpdateWorkloadActualDto } from './dto/update-workload-actual.dto';

@Controller('workload-actual')
@UseGuards(JwtAuthGuard)
export class WorkloadActualController {
  constructor(private readonly workloadActualService: WorkloadActualService) {}

  @Get()
  async findAll(
    @Query() filters: WorkloadActualFilterDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    // Non-admin/manager users can only see their own data
    const userId =
      user.role !== 'Admin' && user.role !== 'Manager'
        ? user.sub
        : filters.userId;

    return this.workloadActualService.findAll({
      userId,
      projectId: filters.projectId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page,
      limit: filters.limit,
    });
  }

  @Get('my')
  async getMyWorkload(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workloadActualService.getMyWorkload(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('date/:date')
  async findByDate(
    @CurrentUser('sub') userId: string,
    @Param('date') date: string,
  ) {
    return this.workloadActualService.findByUserAndDate(userId, new Date(date));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workloadActualService.findOne(id);
  }

  @Post('create')
  async create(
    @CurrentUser('sub') userId: string,
    @Body()
    dto: {
      date: Date;
      hoursWorked: number;
      userText?: string;
      distributions?: { projectId: string; hours: number; description?: string }[];
    },
  ) {
    return this.workloadActualService.create({
      userId,
      ...dto,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkloadActualDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    const record = await this.workloadActualService.findOne(id);
    if (record.userId !== user.sub && user.role !== 'Admin') {
      throw new ForbiddenException('You can only modify your own workload records');
    }
    return this.workloadActualService.update(id, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    const record = await this.workloadActualService.findOne(id);
    if (record.userId !== user.sub && user.role !== 'Admin') {
      throw new ForbiddenException('You can only delete your own workload records');
    }
    return this.workloadActualService.delete(id);
  }

  // Distribution endpoints
  @Post(':id/distribution')
  async addDistribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      projectId: string;
      hours: number;
      description?: string;
    },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    const record = await this.workloadActualService.findOne(id);
    if (record.userId !== user.sub && user.role !== 'Admin' && user.role !== 'Manager') {
      throw new ForbiddenException('You can only modify distributions on your own workload records');
    }
    return this.workloadActualService.addDistribution(id, dto);
  }

  @Delete('distribution/:distributionId')
  async removeDistribution(
    @Param('distributionId', ParseUUIDPipe) distributionId: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    const distribution = await this.workloadActualService.findDistribution(distributionId);
    if (
      distribution.workloadActual.userId !== user.sub &&
      user.role !== 'Admin' &&
      user.role !== 'Manager'
    ) {
      throw new ForbiddenException('You can only remove distributions from your own workload records');
    }
    return this.workloadActualService.removeDistribution(distributionId);
  }
}
