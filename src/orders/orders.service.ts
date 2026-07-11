import { Injectable, NotFoundException } from '@nestjs/common';
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
    userId: string;
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

  async create(dto: CreateOrderDto): Promise<OrderEntity> {
    const order: OrderWithItems = await this.ordersRepository.createWithItems(
      dto.userId,
      this.generateOrderNumber(),
      dto.items,
    );
    return this.toEntity(order);
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.ordersRepository.findAll(skip, limit),
      this.ordersRepository.count(),
    ]);
    return {
      items: items.map((o) => this.toEntity(o)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');
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
