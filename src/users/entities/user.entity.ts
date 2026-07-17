import { ApiProperty } from '@nestjs/swagger';
import type { Role, User } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { UserStatus } from '../../common/enums/user-status.enum';

export type UserWithRole = User & { role: Pick<Role, 'name'> | null };

export class UserEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ required: false, nullable: true })
  role: string | null;

  @ApiProperty({ required: false, nullable: true })
  profileImage: string | null;

  @Exclude()
  password: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(user: UserWithRole) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.status = user.status as UserStatus;
    this.role = user.role?.name ?? null;
    this.profileImage = user.profileImage ?? null;
    this.password = user.password;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
