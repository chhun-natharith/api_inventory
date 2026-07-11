import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderItemEntity } from './order-item.entity';

export class OrderEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  total: number;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiPropertyOptional({ type: [OrderItemEntity] })
  items?: OrderItemEntity[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }
}
