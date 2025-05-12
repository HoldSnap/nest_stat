import 'reflect-metadata';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  beforeEach(() => {
    service = { create: jest.fn() } as unknown as CategoryService;
    controller = new CategoryController(service);
  });

  it('should have JwtAuthGuard applied to create method', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CategoryController.prototype.create,
    );
    expect(guards).toContain(JwtAuthGuard);
  });

  describe('create', () => {
    const dtoExpense: CreateCategoryDto = {
      name: 'Expense Cat',
      type: CategoryType.EXPENSE,
    };
    const dtoIncome: CreateCategoryDto = {
      name: 'Income Cat',
      type: CategoryType.INCOME,
    };

    it('should call categoryService.create once with EXPENSE dto', async () => {
      (service.create as jest.Mock).mockResolvedValue({
        id: '1',
        ...dtoExpense,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await controller.create(dtoExpense);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dtoExpense);
      expect(result).toMatchObject(dtoExpense);
    });

    it('should call categoryService.create once with INCOME dto', async () => {
      (service.create as jest.Mock).mockResolvedValue({
        id: '2',
        ...dtoIncome,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await controller.create(dtoIncome);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dtoIncome);
      expect(result).toMatchObject(dtoIncome);
    });

    it('should return the exact object returned by service.create', async () => {
      const expected = {
        id: '3',
        ...dtoExpense,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (service.create as jest.Mock).mockResolvedValue(expected);
      const result = await controller.create(dtoExpense);
      expect(result).toBe(expected);
    });

    it('should propagate service rejection', async () => {
      const error = new Error('fail');
      (service.create as jest.Mock).mockRejectedValue(error);
      await expect(controller.create(dtoExpense)).rejects.toThrow(error);
    });

    it('should propagate synchronous errors from service', async () => {
      const errorSync = new Error('sync error');
      (service.create as jest.Mock).mockImplementation(() => {
        throw errorSync;
      });
      await expect(controller.create(dtoExpense)).rejects.toThrow(errorSync);
    });

    it('should handle null dto and forward it to service', async () => {
      (service.create as jest.Mock).mockResolvedValue(null);
      const result = await controller.create(null as any);
      expect(service.create).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });

    it('should allow additional properties in dto', async () => {
      const extendedDto = {
        name: 'Test',
        type: CategoryType.EXPENSE,
        extra: 'value',
      } as any;
      const expected = {
        id: '4',
        ...extendedDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (service.create as jest.Mock).mockResolvedValue(expected);
      const result = await controller.create(extendedDto);
      expect(service.create).toHaveBeenCalledWith(extendedDto);
      expect((result as any).extra).toBe('value');
    });

    it('should return a Promise', () => {
      const promise = controller.create(dtoExpense);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should call service.create twice when invoked twice', async () => {
      (service.create as jest.Mock).mockResolvedValue({
        id: '5',
        ...dtoExpense,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await controller.create(dtoExpense);
      await controller.create(dtoExpense);
      expect(service.create).toHaveBeenCalledTimes(2);
    });
  });
});
