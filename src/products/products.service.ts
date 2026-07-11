import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ProductStatus } from '../common/enums/product-status.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  private toEntity(product: Product): ProductEntity {
    return new ProductEntity({
      ...product,
      status: product.status as ProductStatus,
    });
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const product = await this.productsRepository.create({
      name: dto.name,
      description: dto.description,
      image: dto.image,
      status: dto.status,
      category: { connect: { id: dto.categoryId } },
    });
    return this.toEntity(product);
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.productsRepository.findAll(skip, limit),
      this.productsRepository.count(),
    ]);
    return {
      items: items.map((p) => this.toEntity(p)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return this.toEntity(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    await this.findOne(id);
    const { categoryId, ...rest } = dto;
    const product = await this.productsRepository.update(id, {
      ...rest,
      ...(categoryId && { category: { connect: { id: categoryId } } }),
    });
    return this.toEntity(product);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.delete(id);
  }
}
