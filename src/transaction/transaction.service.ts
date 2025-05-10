// src/transaction/transaction.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as xlsx from 'xlsx';
import { CategoryType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromExcel(buffer: Buffer, userId: string) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    for (const row of rows) {
      const amount = parseFloat(row.amount);
      const date = row.date ? new Date(row.date) : new Date();
      const comment = row.comment || null;
      const categoryName = row.categoryName;
      const categoryType =
        row.categoryType === 'INCOME'
          ? CategoryType.INCOME
          : CategoryType.EXPENSE;

      // ищем категорию по имени (и типу, если нужно)
      let category = await this.prisma.category.findFirst({
        where: {
          name: categoryName,
          type: categoryType,
        },
      });

      if (!category) {
        // если не нашли — создаём
        category = await this.prisma.category.create({
          data: {
            name: categoryName,
            type: categoryType,
          },
        });
      }

      // создаём транзакцию
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
}
