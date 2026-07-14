import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { ROLES } from '../../common/constants';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: ROLES.SUPPORT,
    enum: Object.values(ROLES),
    description: 'The role name to assign to the user',
  })
  @IsString()
  @IsIn(Object.values(ROLES))
  role: string;
}
