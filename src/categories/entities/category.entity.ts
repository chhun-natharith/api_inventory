import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }
}
