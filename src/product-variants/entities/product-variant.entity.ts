import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariantEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  sku: string;

  @ApiPropertyOptional()
  barcode?: string | null;

  @ApiPropertyOptional()
  color?: string | null;

  @ApiPropertyOptional()
  size?: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<ProductVariantEntity>) {
    Object.assign(this, partial);
  }
}
