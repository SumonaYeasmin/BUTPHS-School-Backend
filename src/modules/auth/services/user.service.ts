import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List users with pagination, search, and role filtering
   */
  async findAll(query: QueryUserDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      const roleName = query.role.trim().toUpperCase();
      where.userRoles = {
        some: {
          role: {
            name: roleName,
          },
        },
      };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ResponseHelper.success(
      {
        items: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          roles: u.userRoles.map((ur) => ur.role),
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
      'Users retrieved successfully',
    );
  }

  /**
   * Get single user profile with assigned roles and permissions
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' was not found.`);
    }

    return ResponseHelper.success(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          permissions: ur.role.permissions.map((rp) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
          })),
        })),
      },
      'User details retrieved successfully',
    );
  }

  /**
   * Assign roles to a user (additive, bulk assign)
   */
  async assignRoles(userId: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' was not found.`);
    }

    const uniqueRoleIds = Array.from(new Set(dto.roleIds));

    // Verify all roles exist
    const foundRoles = await this.prisma.role.findMany({
      where: { id: { in: uniqueRoleIds } },
    });

    if (foundRoles.length !== uniqueRoleIds.length) {
      const foundIds = new Set(foundRoles.map((r) => r.id));
      const missingIds = uniqueRoleIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Roles not found for IDs: ${missingIds.join(', ')}`,
      );
    }

    // Insert user-role mappings skipping duplicates
    await this.prisma.userRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({
        userId,
        roleId,
      })),
      skipDuplicates: true,
    });

    // Return the updated assigned roles for the user
    const updatedUserRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: { role: { name: 'asc' } },
    });

    return ResponseHelper.success(
      {
        userId: user.id,
        userName: user.name,
        assignedRolesCount: updatedUserRoles.length,
        roles: updatedUserRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        })),
      },
      `Roles assigned successfully to user '${user.name}'`,
    );
  }

  /**
   * Update (sync/replace) all roles assigned to a user
   */
  async updateUserRoles(userId: string, dto: UpdateUserRolesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' was not found.`);
    }

    const uniqueRoleIds = Array.from(new Set(dto.roleIds || []));

    // If roles are specified, ensure all exist
    if (uniqueRoleIds.length > 0) {
      const foundRoles = await this.prisma.role.findMany({
        where: { id: { in: uniqueRoleIds } },
      });

      if (foundRoles.length !== uniqueRoleIds.length) {
        const foundIds = new Set(foundRoles.map((r) => r.id));
        const missingIds = uniqueRoleIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Roles not found for IDs: ${missingIds.join(', ')}`,
        );
      }
    }

    // Atomic transaction: replace user roles with new set
    const updatedUserRoles = await this.prisma.$transaction(async (tx) => {
      // 1. Delete all current roles for this user
      await tx.userRole.deleteMany({
        where: { userId },
      });

      // 2. Insert new roles if any
      if (uniqueRoleIds.length > 0) {
        await tx.userRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({
            userId,
            roleId,
          })),
        });
      }

      // 3. Return updated roles list
      return tx.userRole.findMany({
        where: { userId },
        include: {
          role: true,
        },
        orderBy: { role: { name: 'asc' } },
      });
    });

    return ResponseHelper.success(
      {
        userId: user.id,
        userName: user.name,
        assignedRolesCount: updatedUserRoles.length,
        roles: updatedUserRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        })),
      },
      `Roles updated successfully for user '${user.name}'`,
    );
  }

  /**
   * Get all roles assigned to a user
   */
  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' was not found.`);
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { role: { name: 'asc' } },
    });

    return ResponseHelper.success(
      {
        userId: user.id,
        userName: user.name,
        totalRoles: userRoles.length,
        roles: userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          permissions: ur.role.permissions.map((rp) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
          })),
        })),
      },
      `Roles for user '${user.name}' retrieved successfully`,
    );
  }

  /**
   * Remove a single role from a user
   */
  async removeRole(userId: string, roleId: string) {
    const assignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      include: {
        user: { select: { name: true } },
        role: { select: { name: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Role with ID '${roleId}' is not assigned to user '${userId}'.`,
      );
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    return ResponseHelper.success(
      {
        userId,
        roleId,
        userName: assignment.user.name,
        roleName: assignment.role.name,
      },
      `Role '${assignment.role.name}' removed from user '${assignment.user.name}' successfully.`,
    );
  }
}
