import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ExpenseService } from './expense.service';
import { ExpenseIOService } from './expense-io.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly expenseIOService: ExpenseIOService,
  ) {}

  @Get()
  async findAll(@Query() filters: ExpenseFilterDto) {
    return this.expenseService.findAll(filters);
  }

  @Get('overdue-summary')
  async getOverdueSummary() {
    return this.expenseService.getOverdueSummary();
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isXlsx =
          file.originalname?.endsWith('.xlsx') ||
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!isXlsx) {
          return cb(
            new BadRequestException('Only .xlsx files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.expenseIOService.importFromExcel(file.buffer, userId);
  }

  @Get('export/excel')
  async exportExcel(@Query() filters: ExpenseFilterDto, @Res() res: Response) {
    const buffer = await this.expenseIOService.exportToExcel(filters);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="expenses.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expenseService.findOne(id);
  }

  @Post('create')
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.expenseService.create(dto, userId);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.expenseService.delete(id);
  }
}
