import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { QueryPermissionDto } from '../dto/query-permission.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new unique permission
   */
  async create(dto: CreatePermissionDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(
        `Permission with name '${name}' already exists.`,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        name,
        description: dto.description?.trim(),
      },
    });

    return ResponseHelper.success(
      permission,
      `Permission '${permission.name}' created successfully`,
    );
  }

  /**
   * Get all permissions with pagination and search
   */
  async findAll(query: QueryPermissionDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, permissions] = await Promise.all([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ResponseHelper.success(
      {
        items: permissions,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      'Permissions list retrieved successfully',
    );
  }

  /**
   * Get single permission details by ID
   */
  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' was not found.`);
    }

    return ResponseHelper.success(
      permission,
      'Permission detail retrieved successfully',
    );
  }

  /**
   * Update permission name or description with uniqueness check
   */
  async update(id: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' was not found.`);
    }

    if (dto.name && dto.name.trim().toUpperCase() !== permission.name) {
      const newName = dto.name.trim().toUpperCase();
      const existing = await this.prisma.permission.findUnique({
        where: { name: newName },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Permission with name '${newName}' already exists.`,
        );
      }
    }

    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim().toUpperCase() : undefined,
        description:
          dto.description !== undefined ? dto.description?.trim() : undefined,
      },
    });

    return ResponseHelper.success(
      updated,
      `Permission '${updated.name}' updated successfully`,
    );
  }

  /**
   * Delete permission with dependency safeguard (blocked if currently assigned to active roles)
   */
  async delete(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        _count: { select: { roles: true } },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' was not found.`);
    }

    if (permission._count.roles > 0) {
      throw new BadRequestException(
        `Cannot delete permission '${permission.name}'. It is currently assigned to ${permission._count.roles} role(s). Remove it from those roles first to prevent authorization errors.`,
      );
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    return ResponseHelper.success(
      { id, name: permission.name },
      `Permission '${permission.name}' has been deleted successfully.`,
    );
  }
}
