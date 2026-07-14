import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleWithPermissions } from './entities/role.entity';

const withPermissions = {
  permissions: { include: { permission: true } },
} as const;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: withPermissions,
    });
  }

  findById(id: number): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: withPermissions,
    });
  }
}
