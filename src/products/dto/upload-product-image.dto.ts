import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadProductImageDto {
  @ApiProperty({ description: 'Alternative text for accessibility', required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ description: 'Display order', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Set as primary image', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
