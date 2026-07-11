import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { ProductVariantsRepository } from './product-variants.repository';

@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly productVariantsRepository: ProductVariantsRepository,
  ) {}

  private toEntity(variant: {
    id: string;
    productId: string;
    sku: string;
    barcode: string | null;
    color: string | null;
    size: string | null;
    price: unknown;
    cost: unknown;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
  }): ProductVariantEntity {
    return new ProductVariantEntity({
      ...variant,
      price: Number(variant.price),
      cost: Number(variant.cost),
    });
  }

  async create(dto: CreateProductVariantDto): Promise<ProductVariantEntity> {
    const variant = await this.productVariantsRepository.create({
      sku: dto.sku,
      barcode: dto.barcode,
      color: dto.color,
      size: dto.size,
      price: dto.price,
      cost: dto.cost,
      quantity: dto.quantity ?? 0,
      product: { connect: { id: dto.productId } },
    });
    return this.toEntity(variant);
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.productVariantsRepository.findAll(skip, limit),
      this.productVariantsRepository.count(),
    ]);
    return {
      items: items.map((v) => this.toEntity(v)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ProductVariantEntity> {
    const variant = await this.productVariantsRepository.findById(id);
    if (!variant) throw new NotFoundException('Product variant not found');
    return this.toEntity(variant);
  }

  async update(
    id: string,
    dto: UpdateProductVariantDto,
  ): Promise<ProductVariantEntity> {
    await this.findOne(id);
    const { productId, ...rest } = dto;
    const variant = await this.productVariantsRepository.update(id, {
      ...rest,
      ...(productId && { product: { connect: { id: productId } } }),
    });
    return this.toEntity(variant);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.productVariantsRepository.delete(id);
  }
}
