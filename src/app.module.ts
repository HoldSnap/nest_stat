import { Module } from '@nestjs/common';
import { CategoryService } from './category/category.service';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [PrismaModule, CategoryModule, UserModule],
  controllers: [],
  providers: [CategoryService],
})
export class AppModule {}
