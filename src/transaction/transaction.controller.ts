import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import {
  TransactionService,
  CategorySummary,
  Stats,
} from './transaction.service';
import { TransactionDto } from './dto/transaction.dto';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Импорт по JSON-массиву
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async importJson(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    transactions: TransactionDto[],
    @Req() req: any,
  ) {
    if (!Array.isArray(transactions)) {
      throw new BadRequestException('Body must be an array');
    }
    await this.transactionService.importFromJson(transactions, req.user.userId);
    return { message: 'JSON import completed', count: transactions.length };
  }

  /**
   * Импорт из Excel
   */
  @UseGuards(JwtAuthGuard)
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
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
    return { message: 'Excel import completed' };
  }

  /**
   * Сводка по категориям
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
        'startDate and endDate are required (YYYY-MM-DD)',
      );
    }
    return this.transactionService.getCategorySummary(
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Общая статистика
   */
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ): Promise<Stats> {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required (YYYY-MM-DD)',
      );
    }
    return this.transactionService.getStats(
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * PDF-отчёт
   */
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
        'startDate and endDate are required (YYYY-MM-DD)',
      );
    }
    const buffer = await this.transactionService.generatePdfReport(
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report_${startDate}_${endDate}.pdf"`,
    });
    res.send(buffer);
  }
}
