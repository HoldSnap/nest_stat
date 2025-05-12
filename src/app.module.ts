import { Module } from '@nestjs/common';
import { CategoryService } from './category/category.service';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesController } from './categories/categories.controller';

@Module({
  imports: [PrismaModule, CategoryModule, AuthModule, TransactionModule],
  controllers: [CategoriesController],
  providers: [CategoryService],
})
export class AppModule {}
