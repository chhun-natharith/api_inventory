import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../common/constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE_OWN)
  @ApiOperation({ summary: 'Create an order for the current user' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.sub, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ORDERS_READ_OWN)
  @ApiOperation({
    summary:
      'List orders. Callers with `orders:read` see all; others see only their own',
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    const canReadAll = user.permissions.includes(PERMISSIONS.ORDERS_READ);
    return this.ordersService.findAll(
      pagination,
      canReadAll ? undefined : user.sub,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ORDERS_READ_OWN)
  @ApiOperation({ summary: 'Get an order by id (scoped for own-only callers)' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const canReadAll = user.permissions.includes(PERMISSIONS.ORDERS_READ);
    return this.ordersService.findOne(id, canReadAll ? undefined : user.sub);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Update an order' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ORDERS_DELETE)
  @ApiOperation({ summary: 'Cancel an order' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }
}
