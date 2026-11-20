import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
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
}
