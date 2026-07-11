import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const password = await this.hash(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      password,
      status: dto.status,
    });
    return new UserEntity(user);
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.usersRepository.findAll(skip, limit),
      this.usersRepository.count(),
    ]);

    return {
      items: items.map((u) => new UserEntity(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.mustFindById(id);
    return new UserEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.mustFindById(id);

    const data: Prisma.UserUpdateInput = { ...dto };
    if (dto.password) {
      data.password = await this.hash(dto.password);
    }

    const user = await this.usersRepository.update(id, data);
    return new UserEntity(user);
  }

  async remove(id: string): Promise<void> {
    await this.mustFindById(id);
    await this.usersRepository.delete(id);
  }

  private async mustFindById(id: string): Promise<User> {
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
