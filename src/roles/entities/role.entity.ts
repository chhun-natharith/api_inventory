import { ApiProperty } from '@nestjs/swagger';
import type { Permission, Role, RolePermission } from '@prisma/client';

export type RoleWithPermissions = Role & {
  permissions: (RolePermission & { permission: Permission })[];
};

export class RoleEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ type: [String] })
  permissions: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(role: RoleWithPermissions) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description;
    this.permissions = role.permissions.map((rp) => rp.permission.name);
    this.createdAt = role.createdAt;
    this.updatedAt = role.updatedAt;
  }
}
