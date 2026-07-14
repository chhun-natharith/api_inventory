import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleEntity } from './entities/role.entity';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async findAll(): Promise<RoleEntity[]> {
    const roles = await this.rolesRepository.findAll();
    return roles.map((r) => new RoleEntity(r));
  }

  async findOne(id: number): Promise<RoleEntity> {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return new RoleEntity(role);
  }
}
