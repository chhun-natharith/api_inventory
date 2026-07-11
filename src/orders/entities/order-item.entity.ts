import { ApiProperty } from '@nestjs/swagger';

export class OrderItemEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  productVariantId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<OrderItemEntity>) {
    Object.assign(this, partial);
  }
}
