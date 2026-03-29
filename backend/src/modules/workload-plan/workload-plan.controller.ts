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
  BadRequestException,
} from '@nestjs/common';
import { WorkloadPlanService } from './workload-plan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard, NotTrialGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkloadPlanDto, UpdateWorkloadPlanDto } from './dto/workload-plan.dto';
import { WorkloadPlanFilterDto } from './dto/workload-plan-filter.dto';

@Controller('workload-plan')
@UseGuards(JwtAuthGuard)
export class WorkloadPlanController {
  constructor(private readonly workloadPlanService: WorkloadPlanService) {}

  @Get()
  async findAll(@Query() filters: WorkloadPlanFilterDto) {
    // Validate date params if provided
    if (filters.startDate && isNaN(new Date(filters.startDate).getTime())) {
      throw new BadRequestException('Invalid startDate format');
    }
    if (filters.endDate && isNaN(new Date(filters.endDate).getTime())) {
      throw new BadRequestException('Invalid endDate format');
    }

    return this.workloadPlanService.findAll({
      userId: filters.userId,
      projectId: filters.projectId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page,
      limit: filters.limit,
    });
  }

  @Get('calendar')
  async getCalendarView(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.workloadPlanService.getCalendarView(
      start,
      end,
      userId,
      projectId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workloadPlanService.findOne(id);
  }

  @Post('create')
  @UseGuards(NotTrialGuard)
  async create(
    @Body() dto: CreateWorkloadPlanDto,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Feature #336: Employees can create plans only for themselves
    // Managers/Admins can create plans for anyone
    const targetUserId = userRole === 'Employee' ? currentUserId : dto.userId;

    return this.workloadPlanService.create({
      userId: targetUserId,
      projectId: dto.projectId,
      date: new Date(dto.date),
      managerId: currentUserId,
      hours: dto.hours,
    });
  }

  @Patch(':id')
  @UseGuards(NotTrialGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkloadPlanDto,
    @CurrentUser('sub') currentUserId: string,
  ) {
    // Feature #336: Employees can update their own plans
    // Service layer handles authorization (only creator or Admin can update)
    return this.workloadPlanService.update(
      id,
      {
        projectId: dto.projectId,
        date: dto.date ? new Date(dto.date) : undefined,
        hours: dto.hours,
      },
      currentUserId,
    );
  }

  @Delete(':id')
  @UseGuards(NotTrialGuard)
  async delete(@Param('id') id: string, @CurrentUser('sub') currentUserId: string) {
    // Feature #336: Employees can delete their own plans
    // Service layer handles authorization (only creator or Admin can delete)
    return this.workloadPlanService.delete(id, currentUserId);
  }
}
