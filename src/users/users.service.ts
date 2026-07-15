import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ROLES } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import {
  UsersRepository,
  UserWithPermissions,
  UserWithRoleName,
} from './users.repository';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new user. If `roleName` is omitted, the user is assigned
   * the default `Customer` role. Callers wanting a different role (e.g.
   * admin creating a Support user) must pass an explicit name.
   */
  async create(dto: CreateUserDto, roleName?: string): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const targetRole = roleName ?? ROLES.CUSTOMER;
    const role = await this.prisma.role.findUnique({
      where: { name: targetRole },
      select: { id: true },
    });
    if (!role) {
      // Missing default role is a server-configuration issue, not a client error.
      throw new InternalServerErrorException(
        `Role "${targetRole}" is not configured. Run \`prisma db seed\`.`,
      );
    }

    const password = await this.hash(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      password,
      status: dto.status,
      role: { connect: { id: role.id } },
    });
    return new UserEntity(user);
  }

  async findAll(filter: FilterUsersDto) {
    const { page, limit, name, email } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.usersRepository.findAll(skip, limit, where),
      this.usersRepository.count(where),
    ]);

    return {
      items: items.map((u) => new UserEntity(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.mustFindById(id);
    return new UserEntity(user);
  }

  findByEmailWithPermissions(email: string): Promise<UserWithPermissions | null> {
    return this.usersRepository.findByEmailWithPermissions(email);
  }

  findByIdWithPermissions(id: number): Promise<UserWithPermissions | null> {
    return this.usersRepository.findByIdWithPermissions(id);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    await this.mustFindById(id);

    const data: Prisma.UserUpdateInput = { ...dto };
    if (dto.password) {
      data.password = await this.hash(dto.password);
    }

    const user = await this.usersRepository.update(id, data);
    return new UserEntity(user);
  }

  async updateRole(id: number, roleName: string): Promise<UserEntity> {
    await this.mustFindById(id);

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    const user = await this.usersRepository.update(id, {
      role: { connect: { id: role.id } },
    });
    return new UserEntity(user);
  }

  async remove(id: number): Promise<void> {
    await this.mustFindById(id);
    await this.usersRepository.delete(id);
  }

  private async mustFindById(id: number): Promise<UserWithRoleName> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }
}
