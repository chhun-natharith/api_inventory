import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.create(dto);
    return new CategoryEntity(category);
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.categoriesRepository.findAll(skip, limit),
      this.categoriesRepository.count(),
    ]);
    return {
      items: items.map((c) => new CategoryEntity(c)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return new CategoryEntity(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    await this.findOne(id);
    const category = await this.categoriesRepository.update(id, dto);
    return new CategoryEntity(category);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.categoriesRepository.delete(id);
  }
}
