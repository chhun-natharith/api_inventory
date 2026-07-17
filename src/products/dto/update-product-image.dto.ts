import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductImageDto {
  @ApiProperty({ description: 'Alternative text for accessibility', required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Set as primary image', required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
