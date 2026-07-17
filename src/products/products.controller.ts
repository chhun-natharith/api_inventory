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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '../common/constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { productImageMulterConfig } from '../config/multer.config';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'List products' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productsService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Get product by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  // Product Image Endpoints
  @Post(':id/images')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @UseInterceptors(FileInterceptor('image', productImageMulterConfig))
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        altText: { type: 'string' },
        order: { type: 'number' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductImageDto,
  ) {
    return this.productsService.uploadProductImage(id, file, dto);
  }

  @Get(':id/images')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Get all product images' })
  getImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getProductImages(id);
  }

  @Get(':id/images/:imageId')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Get a product image by id' })
  getImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.getProductImage(id, imageId);
  }

  @Patch(':id/images/:imageId')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Update product image metadata' })
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productsService.updateProductImage(id, imageId, dto);
  }

  @Patch(':id/images/:imageId/primary')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Set image as primary' })
  setPrimaryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.setPrimaryProductImage(id, imageId);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  @ApiOperation({ summary: 'Delete a product image' })
  deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.deleteProductImage(id, imageId);
  }
}
