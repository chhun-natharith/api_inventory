import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

/**
 * The caller's user id is derived from the JWT (`req.user.sub`) and is
 * not part of this DTO. This ensures a Customer can never create an
 * order on behalf of another user.
 */
export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items: CreateOrderItemDto[];
}
