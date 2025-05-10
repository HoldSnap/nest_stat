// src/transaction/transaction.controller.ts
import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { TransactionService, CategorySummary } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file: Express.Multer.File, cb) => {
        const ok =
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel';
        cb(ok ? null : new Error('Only Excel files allowed'), ok);
      },
    }),
  )
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    await this.transactionService.importFromExcel(file.buffer, req.user.userId);
    return { message: 'Import completed' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate и endDate обязательны в формате YYYY-MM-DD',
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Некорректный формат даты');
    }
    if (start > end) {
      throw new BadRequestException('startDate не может быть позже endDate');
    }
    return this.transactionService.getStats(req.user.userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Get('report')
  async getReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate и endDate обязательны в формате YYYY-MM-DD',
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Некорректный формат даты');
    }
    if (start > end) {
      throw new BadRequestException('startDate не может быть позже endDate');
    }

    const buffer = await this.transactionService.generatePdfReport(
      req.user.userId,
      start,
      end,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report_${startDate}_${endDate}.pdf"`,
    });
    res.send(buffer);
  }

  /**
   * GET /transactions/summary
   * Возвращает сумму по категориям за период
   */
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ): Promise<CategorySummary[]> {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate и endDate обязательны в формате YYYY-MM-DD',
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Некорректный формат даты');
    }
    if (start > end) {
      throw new BadRequestException('startDate не может быть позже endDate');
    }
    return this.transactionService.getCategorySummary(
      req.user.userId,
      start,
      end,
    );
  }
}
