import { Injectable } from '@nestjs/common';
import { Prisma, ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductVariantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductVariantCreateInput): Promise<ProductVariant> {
    return this.prisma.productVariant.create({ data });
  }

  findAll(skip: number, take: number): Promise<ProductVariant[]> {
    return this.prisma.productVariant.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(): Promise<number> {
    return this.prisma.productVariant.count();
  }

  findById(id: string): Promise<ProductVariant | null> {
    return this.prisma.productVariant.findUnique({ where: { id } });
  }

  update(
    id: string,
    data: Prisma.ProductVariantUpdateInput,
  ): Promise<ProductVariant> {
    return this.prisma.productVariant.update({ where: { id }, data });
  }

  delete(id: string): Promise<ProductVariant> {
    return this.prisma.productVariant.delete({ where: { id } });
  }
}
