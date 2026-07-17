import { ApiProperty } from '@nestjs/swagger';

export class ProductImageEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty({ required: false })
  altText?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
