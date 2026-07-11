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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@ApiTags('product-variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a product variant' })
  create(@Body() dto: CreateProductVariantDto) {
    return this.productVariantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List product variants' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productVariantsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product variant by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productVariantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product variant' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product variant' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productVariantsService.remove(id);
  }
}
