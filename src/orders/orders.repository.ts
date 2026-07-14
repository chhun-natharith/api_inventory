import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OrderWithItems extends Order {
  items: Prisma.OrderItemGetPayload<{ include: { productVariant: true } }>[];
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an order together with its order items, snapshotting each
   * item's price and decrementing variant stock atomically. Fails the
   * whole transaction if any variant has insufficient stock.
   */
  async createWithItems(
    userId: number,
    orderNumber: string,
    items: { productVariantId: string; quantity: number }[],
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: items.map((i) => i.productVariantId) } },
      });

      const variantMap = new Map(variants.map((v) => [v.id, v]));

      let total = new Prisma.Decimal(0);
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const item of items) {
        const variant = variantMap.get(item.productVariantId);
        if (!variant) {
          throw new NotFoundException(
            `Product variant ${item.productVariantId} not found`,
          );
        }
        if (variant.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${variant.sku}`,
          );
        }

        const subtotal = variant.price.mul(item.quantity);
        total = total.add(subtotal);

        orderItemsData.push({
          productVariantId: variant.id,
          quantity: item.quantity,
          price: variant.price,
          subtotal,
        });

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          total,
          items: { create: orderItemsData },
        },
      });

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        include: { productVariant: true },
      });

      return { ...order, items: orderItems };
    });
  }

  findAll(skip: number, take: number, userId?: number): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: userId ? { userId } : undefined,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(userId?: number): Promise<number> {
    return this.prisma.order.count({
      where: userId ? { userId } : undefined,
    });
  }

  findById(id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { productVariant: true } } },
    });
  }

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  delete(id: string): Promise<Order> {
    return this.prisma.order.delete({ where: { id } });
  }
}
