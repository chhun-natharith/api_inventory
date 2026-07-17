import { Injectable } from '@nestjs/common';
import { Prisma, Product, ProductImage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  findAll(skip: number, take: number): Promise<Product[]> {
    return this.prisma.product.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(): Promise<number> {
    return this.prisma.product.count();
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  delete(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }

  // Product Image methods
  createImage(data: Prisma.ProductImageCreateInput): Promise<ProductImage> {
    return this.prisma.productImage.create({ data });
  }

  findImagesByProductId(productId: string): Promise<ProductImage[]> {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findImageById(id: string): Promise<ProductImage | null> {
    return this.prisma.productImage.findUnique({ where: { id } });
  }

  updateImage(
    id: string,
    data: Prisma.ProductImageUpdateInput,
  ): Promise<ProductImage> {
    return this.prisma.productImage.update({ where: { id }, data });
  }

  deleteImage(id: string): Promise<ProductImage> {
    return this.prisma.productImage.delete({ where: { id } });
  }

  deleteImagesByProductId(productId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.productImage.deleteMany({ where: { productId } });
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    await this.prisma.$transaction([
      // Remove primary flag from all images
      this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      }),
      // Set the specified image as primary
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);
  }
}
