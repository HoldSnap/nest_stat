import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategorieDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategorieDto,
    });
  }
}
