import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
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
}
