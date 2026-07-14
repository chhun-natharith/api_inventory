import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A User row joined with its role name only — the minimal shape needed
 * by controllers and the `/me` endpoint.
 */
export type UserWithRoleName = Prisma.UserGetPayload<{
  include: { role: { select: { name: true } } };
}>;

/**
 * A User row joined with the full permission list — used by the auth
 * flow to embed role + permissions into freshly issued JWTs.
 */
export type UserWithPermissions = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        permissions: { include: { permission: { select: { name: true } } } };
      };
    };
  };
}>;

const roleWithName = { role: { select: { name: true } } } as const;
const roleWithPermissions = {
  role: {
    include: {
      permissions: { include: { permission: { select: { name: true } } } },
    },
  },
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput): Promise<UserWithRoleName> {
    return this.prisma.user.create({ data, include: roleWithName });
  }

  findAll(skip: number, take: number): Promise<UserWithRoleName[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: roleWithName,
    });
  }

  count(): Promise<number> {
    return this.prisma.user.count();
  }

  findById(id: number): Promise<UserWithRoleName | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: roleWithName,
    });
  }

  findByEmail(email: string): Promise<UserWithRoleName | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: roleWithName,
    });
  }

  /**
   * Loads a user together with the full permission list of their role.
   * Used only by the auth flow when issuing tokens.
   */
  findByIdWithPermissions(id: number): Promise<UserWithPermissions | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: roleWithPermissions,
    });
  }

  findByEmailWithPermissions(
    email: string,
  ): Promise<UserWithPermissions | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: roleWithPermissions,
    });
  }

  update(id: number, data: Prisma.UserUpdateInput): Promise<UserWithRoleName> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: roleWithName,
    });
  }

  delete(id: number): Promise<UserWithRoleName> {
    return this.prisma.user.delete({ where: { id }, include: roleWithName });
  }
}
