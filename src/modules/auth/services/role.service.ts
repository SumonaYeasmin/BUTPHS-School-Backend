import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

const PROTECTED_SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN'];

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new role
   */
  async create(dto: CreateRoleDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(`Role with name '${name}' already exists.`);
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim(),
      },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystemRole: PROTECTED_SYSTEM_ROLES.includes(role.name),
        assignedUsersCount: role._count.userRoles,
      },
      `Role '${role.name}' created successfully`,
    );
  }

  /**
   * Get all roles with pagination, search, and assigned users count
   */
  async findAll(query: QueryRoleDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, roles] = await Promise.all([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ResponseHelper.success(
      {
        items: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystemRole: PROTECTED_SYSTEM_ROLES.includes(r.name),
          assignedUsersCount: r._count.userRoles,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      'Roles list retrieved successfully',
    );
  }

  /**
   * Get single role details by ID
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' was not found.`);
    }

    return ResponseHelper.success(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystemRole: PROTECTED_SYSTEM_ROLES.includes(role.name),
        assignedUsersCount: role._count.userRoles,
      },
      'Role details retrieved successfully',
    );
  }

  /**
   * Update role name and description
   */
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' was not found.`);
    }

    // Protect system roles from renaming
    if (dto.name && dto.name.trim().toUpperCase() !== role.name) {
      if (PROTECTED_SYSTEM_ROLES.includes(role.name)) {
        throw new BadRequestException(
          `Protected system role '${role.name}' cannot be renamed.`,
        );
      }

      const newName = dto.name.trim().toUpperCase();
      const existing = await this.prisma.role.findUnique({
        where: { name: newName },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Role with name '${newName}' already exists.`,
        );
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim().toUpperCase() : undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() : undefined,
      },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        isSystemRole: PROTECTED_SYSTEM_ROLES.includes(updated.name),
        assignedUsersCount: updated._count.userRoles,
      },
      `Role '${updated.name}' updated successfully`,
    );
  }

  /**
   * Delete role (safeguard: system roles and active assigned users check)
   */
  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' was not found.`);
    }

    if (PROTECTED_SYSTEM_ROLES.includes(role.name)) {
      throw new BadRequestException(
        `Protected system role '${role.name}' cannot be deleted.`,
      );
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}'. It is currently assigned to ${role._count.userRoles} user(s). Reassign or remove them first.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return ResponseHelper.success(
      { id, name: role.name },
      `Role '${role.name}' has been deleted successfully.`,
    );
  }
}
