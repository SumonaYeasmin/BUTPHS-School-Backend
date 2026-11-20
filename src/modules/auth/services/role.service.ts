import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
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

  /**
   * Assign permissions to a role (bulk assign by UUIDs)
   */
  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' was not found.`);
    }

    const uniquePermissionIds = Array.from(new Set(dto.permissionIds));

    // Verify all permissions exist
    const foundPermissions = await this.prisma.permission.findMany({
      where: { id: { in: uniquePermissionIds } },
    });

    if (foundPermissions.length !== uniquePermissionIds.length) {
      const foundIds = new Set(foundPermissions.map((p) => p.id));
      const missingIds = uniquePermissionIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Permissions not found for IDs: ${missingIds.join(', ')}`,
      );
    }

    // Insert assignments skipping duplicates
    await this.prisma.rolePermission.createMany({
      data: uniquePermissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });

    // Return the updated assigned permissions list for this role
    const assigned = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
      orderBy: { permission: { name: 'asc' } },
    });

    return ResponseHelper.success(
      {
        roleId: role.id,
        roleName: role.name,
        assignedCount: assigned.length,
        permissions: assigned.map((ap) => ({
          id: ap.permission.id,
          name: ap.permission.name,
          description: ap.permission.description,
        })),
      },
      `Permissions assigned successfully to role '${role.name}'`,
    );
  }

  /**
   * Update (sync/replace) all permissions assigned to a role
   */
  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' was not found.`);
    }

    const uniquePermissionIds = Array.from(new Set(dto.permissionIds || []));

    // If permissions are specified, ensure each exists in database
    if (uniquePermissionIds.length > 0) {
      const foundPermissions = await this.prisma.permission.findMany({
        where: { id: { in: uniquePermissionIds } },
      });

      if (foundPermissions.length !== uniquePermissionIds.length) {
        const foundIds = new Set(foundPermissions.map((p) => p.id));
        const missingIds = uniquePermissionIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Permissions not found for IDs: ${missingIds.join(', ')}`,
        );
      }
    }

    // Atomic transaction: replace role permissions with new set
    const updatedRolePermissions = await this.prisma.$transaction(async (tx) => {
      // 1. Delete all current permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // 2. Insert new permissions if any
      if (uniquePermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      // 3. Return updated list
      return tx.rolePermission.findMany({
        where: { roleId },
        include: {
          permission: true,
        },
        orderBy: { permission: { name: 'asc' } },
      });
    });

    return ResponseHelper.success(
      {
        roleId: role.id,
        roleName: role.name,
        assignedCount: updatedRolePermissions.length,
        permissions: updatedRolePermissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      },
      `Permissions updated successfully for role '${role.name}'`,
    );
  }

  /**
   * Get all permissions assigned to a role
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' was not found.`);
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
      orderBy: { permission: { name: 'asc' } },
    });

    return ResponseHelper.success(
      {
        roleId: role.id,
        roleName: role.name,
        totalPermissions: rolePermissions.length,
        permissions: rolePermissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
        })),
      },
      `Permissions for role '${role.name}' retrieved successfully`,
    );
  }

  /**
   * Remove a single permission from a role
   */
  async removePermission(roleId: string, permissionId: string) {
    const assignment = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      include: {
        role: { select: { name: true } },
        permission: { select: { name: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Permission with ID '${permissionId}' is not assigned to role '${roleId}'.`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return ResponseHelper.success(
      {
        roleId,
        permissionId,
        roleName: assignment.role.name,
        permissionName: assignment.permission.name,
      },
      `Permission '${assignment.permission.name}' removed from role '${assignment.role.name}' successfully.`,
    );
  }
}
