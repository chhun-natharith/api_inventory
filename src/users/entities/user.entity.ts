import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { UserStatus } from '../../common/enums/user-status.enum';

export class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @Exclude()
  password: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.status = user.status as UserStatus;
    this.password = user.password;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
