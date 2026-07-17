import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Product, ProductImage } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ProductStatus } from '../common/enums/product-status.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductsRepository } from './products.repository';
import {
  deleteFile,
  getPublicFileUrl,
  getFullFilePath,
} from '../common/utils/file.util';

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
    
    // Delete all product images from filesystem
    const images = await this.productsRepository.findImagesByProductId(id);
    images.forEach((img) => {
      const fullPath = getFullFilePath(img.imageUrl);
      deleteFile(fullPath);
    });
    
    await this.productsRepository.delete(id);
  }

  // Product Image Methods
  private toImageEntity(image: ProductImage): ProductImageEntity {
    return {
      id: image.id,
      productId: image.productId,
      imageUrl: image.imageUrl,
      altText: image.altText ?? undefined,
      order: image.order,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    dto: UploadProductImageDto,
  ): Promise<ProductImageEntity> {
    // Verify product exists
    await this.findOne(productId);

    const imageUrl = getPublicFileUrl(file.path);

    const image = await this.productsRepository.createImage({
      imageUrl,
      altText: dto.altText,
      order: dto.order ?? 0,
      isPrimary: dto.isPrimary ?? false,
      product: { connect: { id: productId } },
    });

    // If set as primary, ensure no other images are primary
    if (dto.isPrimary) {
      await this.productsRepository.setPrimaryImage(productId, image.id);
    }

    return this.toImageEntity(image);
  }

  async getProductImages(productId: string): Promise<ProductImageEntity[]> {
    await this.findOne(productId);
    const images = await this.productsRepository.findImagesByProductId(
      productId,
    );
    return images.map((img) => this.toImageEntity(img));
  }

  async getProductImage(
    productId: string,
    imageId: string,
  ): Promise<ProductImageEntity> {
    await this.findOne(productId);
    const image = await this.productsRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }
    return this.toImageEntity(image);
  }

  async updateProductImage(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImageEntity> {
    const image = await this.getProductImage(productId, imageId);

    const updated = await this.productsRepository.updateImage(imageId, dto);

    // If set as primary, ensure no other images are primary
    if (dto.isPrimary) {
      await this.productsRepository.setPrimaryImage(productId, imageId);
    }

    return this.toImageEntity(updated);
  }

  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    const image = await this.getProductImage(productId, imageId);

    // Delete file from filesystem
    const fullPath = getFullFilePath(image.imageUrl);
    deleteFile(fullPath);

    await this.productsRepository.deleteImage(imageId);
  }

  async setPrimaryProductImage(
    productId: string,
    imageId: string,
  ): Promise<ProductImageEntity> {
    await this.getProductImage(productId, imageId);
    await this.productsRepository.setPrimaryImage(productId, imageId);
    const image = await this.productsRepository.findImageById(imageId);
    return this.toImageEntity(image!);
  }
}
