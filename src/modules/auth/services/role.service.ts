import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

const PROTECTED_SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN'];

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new role with optional initial permissions
   */
  async create(dto: CreateRoleDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(`Role with name '${name}' already exists.`);
    }

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      const validPermissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
        select: { id: true },
      });

      if (validPermissions.length !== dto.permissionIds.length) {
        throw new BadRequestException(
          'One or more specified permission IDs do not exist.',
        );
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim(),
        permissions: dto.permissionIds?.length
          ? {
              createMany: {
                data: dto.permissionIds.map((permissionId) => ({
                  permissionId,
                })),
              },
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
            permissions: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        permissionsCount: role._count.permissions,
        assignedUsersCount: role._count.userRoles,
        permissions: role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      },
      `Role '${role.name}' created successfully`,
    );
  }

  /**
   * Get all roles with pagination, search, and permission counts
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
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
              permissions: true,
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
          permissionsCount: r._count.permissions,
          assignedUsersCount: r._count.userRoles,
          permissions: r.permissions.map((p) => ({
            id: p.permission.id,
            name: p.permission.name,
          })),
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
   * Get single role details with full permissions and assigned user count
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
              },
            },
          },
          take: 20,
        },
        _count: {
          select: {
            userRoles: true,
            permissions: true,
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
        permissionsCount: role._count.permissions,
        assignedUsersCount: role._count.userRoles,
        permissions: role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
        sampleUsers: role.userRoles.map((ur) => ur.user),
      },
      'Role details retrieved successfully',
    );
  }

  /**
   * Assign permissions to a role without removing existing ones
   */
  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' was not found.`);
    }

    // Verify all permission IDs exist
    const validPermissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true },
    });

    if (validPermissions.length !== dto.permissionIds.length) {
      throw new BadRequestException(
        'One or more specified permission IDs do not exist.',
      );
    }

    // Upsert permissions
    await this.prisma.$transaction(async (tx) => {
      for (const permissionId of dto.permissionIds) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId,
            },
          },
          create: {
            roleId,
            permissionId,
          },
          update: {},
        });
      }
    });

    const updated = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return ResponseHelper.success(
      {
        roleId: updated!.id,
        roleName: updated!.name,
        permissionsCount: updated!.permissions.length,
        permissions: updated!.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
        })),
      },
      `Permissions assigned to role '${role.name}' successfully`,
    );
  }

  /**
   * Assign role(s) to a user
   */
  async assignRolesToUser(dto: AssignUserRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${dto.userId}' was not found.`);
    }

    const validRoles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds } },
    });

    if (validRoles.length !== dto.roleIds.length) {
      throw new BadRequestException(
        'One or more specified role IDs do not exist.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const roleId of dto.roleIds) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: dto.userId,
              roleId,
            },
          },
          create: {
            userId: dto.userId,
            roleId,
          },
          update: {},
        });
      }
    });

    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return ResponseHelper.success(
      {
        userId: user.id,
        userName: user.name,
        roles: userWithRoles!.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
        })),
      },
      `Roles assigned to user '${user.name}' successfully`,
    );
  }
}
