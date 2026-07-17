import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { userImageMulterConfig } from '../config/multer.config';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List users' })
  findAll(@Query() filter: FilterUsersDto) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get a user by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/role')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOperation({ summary: "Change a user's role" })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/profile-image')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @UseInterceptors(FileInterceptor('image', userImageMulterConfig))
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProfileImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(id, file);
  }

  @Patch(':id/profile-image')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @UseInterceptors(FileInterceptor('image', userImageMulterConfig))
  @ApiOperation({ summary: 'Update user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  updateProfileImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(id, file);
  }

  @Delete(':id/profile-image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Delete user profile image' })
  deleteProfileImage(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteProfileImage(id);
  }
}
