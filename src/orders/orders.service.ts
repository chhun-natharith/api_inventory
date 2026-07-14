import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderWithItems, OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  private toEntity(order: {
    id: string;
    userId: number;
    orderNumber: string;
    total: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    items?: {
      id: string;
      orderId: string;
      productVariantId: string;
      quantity: number;
      price: unknown;
      subtotal: unknown;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }): OrderEntity {
    return new OrderEntity({
      ...order,
      total: Number(order.total),
      status: order.status as OrderEntity['status'],
      items: order.items?.map((item) => ({
        ...item,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
      })),
    });
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Creates an order on behalf of the authenticated user. The caller
   * supplies only the items — the owner is derived from the JWT so a
   * Customer can never spoof another user's id.
   */
  async create(userId: number, dto: CreateOrderDto): Promise<OrderEntity> {
    const order: OrderWithItems = await this.ordersRepository.createWithItems(
      userId,
      this.generateOrderNumber(),
      dto.items,
    );
    return this.toEntity(order);
  }

  /**
   * Lists orders. When `scopeToUserId` is provided, only that user's
   * orders are returned — this is the fallback for callers that hold
   * `orders:read-own` but not `orders:read`.
   */
  async findAll(pagination: PaginationDto, scopeToUserId?: number) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.ordersRepository.findAll(skip, limit, scopeToUserId),
      this.ordersRepository.count(scopeToUserId),
    ]);
    return {
      items: items.map((o) => this.toEntity(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, scopeToUserId?: number): Promise<OrderEntity> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (scopeToUserId && order.userId !== scopeToUserId) {
      // Hide the record's existence — an "own-only" caller has no
      // business knowing whether some other user's order exists.
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.toEntity(order);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderEntity> {
    await this.findOne(id);
    if (!dto.status) {
      return this.findOne(id);
    }
    const order = await this.ordersRepository.updateStatus(id, dto.status);
    return this.toEntity(order);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.ordersRepository.delete(id);
  }
}
