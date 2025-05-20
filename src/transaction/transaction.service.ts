// src/transaction/transaction.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as xlsx from 'xlsx';
import { CategoryType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import { TransactionDto, CategoryTypeDto } from './dto/transaction.dto';

export interface Stats {
  averageIncome: number;
  averageExpense: number;
  medianAmount: number;
  modeAmount: number[];
}

export interface CategorySummary {
  categoryName: string;
  categoryType: 'Пополнение' | 'Трата';
  totalAmount: number;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Импорт транзакций из JSON-массива
   */
  async importFromJson(rows: TransactionDto[], userId: string) {
    for (const row of rows) {
      const { amount, date, comment, categoryName, categoryType } = row;
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new BadRequestException(`Invalid amount: ${row.amount}`);
      }
      // Если дата не передана или пустая, используем current date
      const txDate = date ? new Date(date) : new Date();
      if (isNaN(txDate.getTime())) {
        throw new BadRequestException(`Invalid date: ${row.date}`);
      }

      const type =
        categoryType === CategoryTypeDto.INCOME
          ? CategoryType.INCOME
          : CategoryType.EXPENSE;

      let category = await this.prisma.category.findFirst({
        where: { name: categoryName, type },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: { name: categoryName, type },
        });
      }

      await this.prisma.transaction.create({
        data: {
          amount,
          date: txDate,
          comment: comment || null,
          userId,
          categoryId: category.id,
        },
      });
    }
  }

  /**
   * Импорт транзакций из Excel-файла
   */
  async importFromExcel(buffer: Buffer, userId: string) {
    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (isNaN(amount)) continue;

      const txDate = row.date instanceof Date ? row.date : new Date(row.date);
      const comment = row.comment || null;
      const categoryName = String(row.categoryName);
      const type =
        row.categoryType === 'INCOME'
          ? CategoryType.INCOME
          : CategoryType.EXPENSE;

      let category = await this.prisma.category.findFirst({
        where: { name: categoryName, type },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: { name: categoryName, type },
        });
      }

      await this.prisma.transaction.create({
        data: {
          amount,
          date: txDate,
          comment,
          userId,
          categoryId: category.id,
        },
      });
    }
  }

  /**
   * Рассчитывает общую статистику за период
   */
  async getStats(userId: string, start?: Date, end?: Date): Promise<Stats> {
    const where: any = { userId };
    if (start || end) {
      where.date = {};
      if (start) where.date.gte = start;
      if (end) where.date.lte = end;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { categories: true },
      orderBy: { date: 'asc' },
    });

    const incomes = transactions
      .filter((t) => t.categories.type === CategoryType.INCOME)
      .map((t) => Number(t.amount));
    const expenses = transactions
      .filter((t) => t.categories.type === CategoryType.EXPENSE)
      .map((t) => Number(t.amount));

    const average = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const averageIncome = average(incomes);
    const averageExpense = average(expenses);

    const all = transactions.map((t) => Number(t.amount)).sort((a, b) => a - b);

    const n = all.length;
    let medianAmount = 0;
    if (n > 0) {
      const mid = Math.floor(n / 2);
      medianAmount = n % 2 ? all[mid] : (all[mid - 1] + all[mid]) / 2;
    }

    const freq = new Map<number, number>();
    all.forEach((val) => freq.set(val, (freq.get(val) || 0) + 1));
    const maxFreq = Math.max(...freq.values(), 0);
    const modeAmount = [...freq.entries()]
      .filter(([, count]) => count === maxFreq)
      .map(([val]) => val);

    return { averageIncome, averageExpense, medianAmount, modeAmount };
  }

  /**
   * Генерация PDF-отчёта
   */
  async generatePdfReport(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Buffer> {
    const stats = await this.getStats(userId, start, end);
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { categories: true },
      orderBy: { date: 'asc' },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const fontPath = path.resolve(
      process.cwd(),
      'src/assets/fonts/DejaVuSans.ttf',
    );
    doc.registerFont('DejaVuSans', fontPath);
    doc.font('DejaVuSans');

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    // Заголовок
    doc.fontSize(18).text('Отчёт по транзакциям', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(
        `Период: ${start.toISOString().split('T')[0]} – ${end.toISOString().split('T')[0]}`,
      );
    doc.moveDown(1);

    // Статистика
    doc.fontSize(14).text('Статистика', { underline: true });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`Средний доход: ${stats.averageIncome.toFixed(2)}`)
      .text(`Средний расход: ${stats.averageExpense.toFixed(2)}`)
      .text(`Медиана: ${stats.medianAmount.toFixed(2)}`)
      .text(`Мода: ${stats.modeAmount.join(', ')}`);
    doc.moveDown(1);

    // Таблица транзакций
    const cols = [50, 130, 200, 300, 420];
    let y = doc.y;
    doc
      .fontSize(10)
      .text('Дата', cols[0], y)
      .text('Сумма', cols[1], y)
      .text('Тип', cols[2], y)
      .text('Категория', cols[3], y)
      .text('Комментарий', cols[4], y);
    y += 20;
    const lineH = 18;

    for (const tx of transactions) {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 40;
      }
      const dateStr = tx.date.toISOString().split('T')[0];
      const typeLabel =
        tx.categories.type === CategoryType.INCOME ? 'Пополнение' : 'Трата';
      doc
        .fontSize(10)
        .text(dateStr, cols[0], y)
        .text(tx.amount.toFixed(2), cols[1], y)
        .text(typeLabel, cols[2], y)
        .text(tx.categories.name, cols[3], y)
        .text(tx.comment || '', cols[4], y);
      y += lineH;
    }

    doc.end();
    return new Promise((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(buffers))),
    );
  }

  /**
   * Сводка по категориям
   */
  async getCategorySummary(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<(CategorySummary & { dates: Date[] })[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { categories: true },
    });

    const map = new Map<
      string,
      { type: CategoryType; sum: number; dates: Date[] }
    >();
    for (const tx of transactions) {
      const key = tx.categories.name;
      const amt = Number(tx.amount);
      if (map.has(key)) {
        const summary = map.get(key)!;
        summary.sum += amt;
        summary.dates.push(tx.date);
      } else {
        map.set(key, { type: tx.categories.type, sum: amt, dates: [tx.date] });
      }
    }

    return Array.from(map.entries()).map(([name, { type, sum, dates }]) => ({
      categoryName: name,
      categoryType: type === CategoryType.INCOME ? 'Пополнение' : 'Трата',
      totalAmount: sum,
      dates: dates.sort((a, b) => a.getTime() - b.getTime()),
    }));
  }
}
