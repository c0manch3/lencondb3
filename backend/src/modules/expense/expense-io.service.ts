import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseService } from './expense.service';
import { ExpenseFilterDto } from './dto/expense.dto';
import { ExpenseCategory } from '@prisma/client';
import * as XLSX from 'xlsx';

export interface ParsedExpense {
  date: Date;
  amount: number;
  vatAmount: number | null;
  category: ExpenseCategory;
  description: string | null;
}

export interface ParseError {
  row: number;
  message: string;
}

const categoryRuToEnum: Record<string, ExpenseCategory> = {
  'Зарплата': ExpenseCategory.Salary,
  'НДФЛ': ExpenseCategory.IncomeTax,
  'Страховые взносы': ExpenseCategory.InsuranceContrib,
  'ФСС НС и ПЗ': ExpenseCategory.SocialInsurance,
  'УСН': ExpenseCategory.SimplifiedTax,
  'НДС': ExpenseCategory.VAT,
  'Пени': ExpenseCategory.Penalty,
  'ИП УСН': ExpenseCategory.IndividualTax,
  'Аренда': ExpenseCategory.Rent,
  'Услуги': ExpenseCategory.Services,
  'Прочее': ExpenseCategory.Other,
};

const categoryEnumToRu: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Salary]: 'Зарплата',
  [ExpenseCategory.IncomeTax]: 'НДФЛ',
  [ExpenseCategory.InsuranceContrib]: 'Страховые взносы',
  [ExpenseCategory.SocialInsurance]: 'ФСС НС и ПЗ',
  [ExpenseCategory.SimplifiedTax]: 'УСН',
  [ExpenseCategory.VAT]: 'НДС',
  [ExpenseCategory.Penalty]: 'Пени',
  [ExpenseCategory.IndividualTax]: 'ИП УСН',
  [ExpenseCategory.Rent]: 'Аренда',
  [ExpenseCategory.Services]: 'Услуги',
  [ExpenseCategory.Other]: 'Прочее',
};

@Injectable()
export class ExpenseIOService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenseService: ExpenseService,
  ) {}

  parseExcelFile(buffer: Buffer): { rows: ParsedExpense[]; errors: ParseError[] } {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Invalid Excel file');
    }
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('Excel file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });

    const MAX_IMPORT_ROWS = 1000;
    if (rawRows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Too many rows. Maximum ${MAX_IMPORT_ROWS} rows per import`,
      );
    }

    const rows: ParsedExpense[] = [];
    const errors: ParseError[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2; // +2: 1-based + header row

      // Parse date
      const rawDate = raw['Дата'];
      let date: Date | null = null;

      if (rawDate instanceof Date) {
        date = rawDate;
      } else if (typeof rawDate === 'number') {
        // Excel serial date
        const parsed = XLSX.SSF.parse_date_code(rawDate);
        if (parsed) {
          date = new Date(parsed.y, parsed.m - 1, parsed.d);
        }
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        // Try DD.MM.YYYY format
        const match = rawDate.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (match) {
          date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        } else {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            date = parsed;
          }
        }
      }

      if (!date || isNaN(date.getTime())) {
        errors.push({ row: rowNum, message: 'Некорректная дата' });
        continue;
      }

      // Parse amount
      const rawAmount = raw['Сумма'];
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);

      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNum, message: 'Сумма должна быть положительным числом' });
        continue;
      }

      // Parse VAT
      const rawVat = raw['НДС'];
      let vatAmount: number | null = null;

      if (rawVat !== null && rawVat !== undefined && rawVat !== '') {
        const parsedVat = typeof rawVat === 'number' ? rawVat : Number(rawVat);
        if (!isNaN(parsedVat) && parsedVat >= 0) {
          vatAmount = parsedVat;
        }
      }

      // Parse category
      const rawCategory = raw['Категория'];
      const categoryStr = typeof rawCategory === 'string' ? rawCategory.trim() : '';
      const category = categoryRuToEnum[categoryStr];

      if (!category) {
        errors.push({
          row: rowNum,
          message: `Неизвестная категория: "${categoryStr}". Допустимые: ${Object.keys(categoryRuToEnum).join(', ')}`,
        });
        continue;
      }

      // Parse description
      const rawDescription = raw['Описание'];
      const description =
        rawDescription !== null && rawDescription !== undefined
          ? String(rawDescription).trim() || null
          : null;

      rows.push({ date, amount, vatAmount, category, description });
    }

    return { rows, errors };
  }

  async importFromExcel(
    buffer: Buffer,
    userId: string,
  ): Promise<{ imported: number; errors: ParseError[] }> {
    const { rows, errors } = this.parseExcelFile(buffer);

    if (rows.length > 0) {
      await this.prisma.expense.createMany({
        data: rows.map((row) => ({
          date: row.date,
          amount: row.amount,
          vatAmount: row.vatAmount,
          category: row.category,
          description: row.description,
          createdById: userId,
        })),
      });
    }

    return { imported: rows.length, errors };
  }

  async exportToExcel(filters: ExpenseFilterDto): Promise<Buffer> {
    const expenses = await this.expenseService.findAllForExport(filters);

    const data = expenses.map((expense) => ({
      'Дата': formatDate(expense.date),
      'Сумма': expense.amount,
      'НДС': expense.vatAmount ?? '',
      'Категория': categoryEnumToRu[expense.category] || expense.category,
      'Описание': expense.description || '',
      'Кем создан': expense.createdBy
        ? `${expense.createdBy.lastName} ${expense.createdBy.firstName}`
        : '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Дата
      { wch: 14 }, // Сумма
      { wch: 14 }, // НДС
      { wch: 22 }, // Категория
      { wch: 40 }, // Описание
      { wch: 25 }, // Кем создан
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Расходы');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buf);
  }
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
