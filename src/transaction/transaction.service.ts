// src/transaction/transaction.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as xlsx from 'xlsx';
import { CategoryType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as path from 'path';

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
   * Разбирает переданный Excel (buffer), создаёт категории и транзакции для userId.
   */
  async importFromExcel(buffer: Buffer, userId: string) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      if (isNaN(amount)) continue;

      let date: Date;
      if (row.date instanceof Date) date = row.date;
      else if (row.date) date = new Date(row.date);
      else date = new Date();

      const comment = row.comment || null;
      const categoryName = String(row.categoryName);
      const categoryType =
        row.categoryType === 'INCOME'
          ? CategoryType.INCOME
          : CategoryType.EXPENSE;

      let category = await this.prisma.category.findFirst({
        where: { name: categoryName, type: categoryType },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: { name: categoryName, type: categoryType },
        });
      }

      await this.prisma.transaction.create({
        data: {
          amount,
          date,
          comment,
          userId,
          categoryId: category.id,
        },
      });
    }
  }

  /**
   * Возвращает статистику по транзакциям пользователя за период.
   */
  async getStats(userId: string, start?: Date, end?: Date): Promise<Stats> {
    const dateFilter: any = {};
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    const where: any = { userId };
    if (start || end) where.date = dateFilter;

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

    const average = (nums: number[]) =>
      nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

    const averageIncome = average(incomes);
    const averageExpense = average(expenses);

    const all = transactions.map((t) => Number(t.amount)).sort((a, b) => a - b);

    let medianAmount = 0;
    const n = all.length;
    if (n > 0) {
      const mid = Math.floor(n / 2);
      medianAmount = n % 2 === 1 ? all[mid] : (all[mid - 1] + all[mid]) / 2;
    }

    const freq = new Map<number, number>();
    all.forEach((val) => freq.set(val, (freq.get(val) || 0) + 1));

    let maxFreq = 0;
    freq.forEach((count) => {
      if (count > maxFreq) maxFreq = count;
    });

    const modeAmount = [...freq.entries()]
      .filter(([, count]) => count === maxFreq)
      .map(([val]) => val);

    return { averageIncome, averageExpense, medianAmount, modeAmount };
  }

  /**
   * Генерирует PDF-отчет за период [start, end] с полной статистикой и списком транзакций.
   * Колонки выровнены по жёстким координатам. Типы транзакций на русском.
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

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Заголовок
    doc.fontSize(18).text('Отчёт по транзакциям', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(
        `Период: ${start.toISOString().split('T')[0]} — ${end.toISOString().split('T')[0]}`,
      );
    doc.moveDown(1);

    // Статистика
    doc.fontSize(14).text('Статистика', { underline: true });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`Средний доход: ${stats.averageIncome.toFixed(2)}`)
      .text(`Средний расход: ${stats.averageExpense.toFixed(2)}`)
      .text(`Медиана суммы: ${stats.medianAmount.toFixed(2)}`)
      .text(`Мода: ${stats.modeAmount.join(', ')}`);
    doc.moveDown(1);

    // Таблица
    const cols = [50, 120, 200, 300, 420];
    const headerY = doc.y;
    doc
      .fontSize(10)
      .text('Дата', cols[0], headerY)
      .text('Сумма', cols[1], headerY)
      .text('Тип', cols[2], headerY)
      .text('Категория', cols[3], headerY)
      .text('Комментарий', cols[4], headerY);
    let y = headerY + 20;
    const lineHeight = 18;

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
      y += lineHeight;
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Возвращает сумму трат и пополнений по категориям за период [start, end]
   */
  async getCategorySummary(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<CategorySummary[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { categories: true },
    });

    const map = new Map<string, { type: CategoryType; sum: number }>();
    for (const tx of transactions) {
      const key = tx.categories.name;
      const amt = Number(tx.amount);
      const prev = map.get(key);
      if (prev) prev.sum += amt;
      else map.set(key, { type: tx.categories.type, sum: amt });
    }

    return Array.from(map.entries()).map(([name, { type, sum }]) => ({
      categoryName: name,
      categoryType: type === CategoryType.INCOME ? 'Пополнение' : 'Трата',
      totalAmount: sum,
    }));
  }
}
