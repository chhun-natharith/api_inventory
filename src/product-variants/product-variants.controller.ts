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
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@ApiTags('product-variants')
@ApiBearerAuth()
@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.VARIANTS_WRITE)
  @ApiOperation({ summary: 'Create a product variant' })
  create(@Body() dto: CreateProductVariantDto) {
    return this.productVariantsService.create(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.VARIANTS_READ)
  @ApiOperation({ summary: 'List product variants' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productVariantsService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.VARIANTS_READ)
  @ApiOperation({ summary: 'Get product variant by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productVariantsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.VARIANTS_WRITE)
  @ApiOperation({ summary: 'Update a product variant' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.VARIANTS_DELETE)
  @ApiOperation({ summary: 'Delete a product variant' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productVariantsService.remove(id);
  }
}
