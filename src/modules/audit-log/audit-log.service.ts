import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { ResponseHelper } from '../../common/helpers/response.helper';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log record with automatic IP/UserAgent fallback and user validation
   */
  async create(
    dto: CreateAuditLogDto,
    currentUser?: any,
    clientIp?: string,
    clientUserAgent?: string,
  ) {
    const action = dto.action?.trim().toUpperCase();
    const moduleName = dto.module?.trim().toUpperCase();

    if (!action) {
      throw new BadRequestException('Audit action must not be empty');
    }
    if (!moduleName) {
      throw new BadRequestException('Audit module must not be empty');
    }

    // Determine target userId
    const effectiveUserId = dto.userId || currentUser?.id || null;

    if (effectiveUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException(
          `User with ID '${effectiveUserId}' was not found.`,
        );
      }
    }

    // Auto-capture IP and User-Agent if not explicitly supplied
    const effectiveIp =
      dto.ipAddress ||
      clientIp ||
      null;

    const effectiveUserAgent =
      dto.userAgent ||
      clientUserAgent ||
      null;

    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: effectiveUserId,
        action,
        module: moduleName,
        ipAddress: effectiveIp,
        userAgent: effectiveUserAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      auditLog,
      'Audit log entry recorded successfully',
    );
  }

  /**
   * Get paginated and filtered list of audit logs
   */
  async findAll(query: QueryAuditLogDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.module) {
      where.module = query.module.trim().toUpperCase();
    }

    if (query.action) {
      where.action = {
        contains: query.action.trim(),
        mode: 'insensitive',
      };
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { action: { contains: term, mode: 'insensitive' } },
        { module: { contains: term, mode: 'insensitive' } },
        { ipAddress: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
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
        items,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      'Audit logs retrieved successfully',
    );
  }

  /**
   * Get distinct modules present in audit logs for frontend filter dropdowns
   */
  async getDistinctModules() {
    const records = await this.prisma.auditLog.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });

    const modules = records.map((r) => r.module);

    return ResponseHelper.success(
      modules,
      'Distinct audit log modules retrieved successfully',
    );
  }

  /**
   * Get single audit log details by ID
   */
  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            userRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException(
        `Audit log record with ID '${id}' was not found.`,
      );
    }

    return ResponseHelper.success(
      auditLog,
      'Audit log detail retrieved successfully',
    );
  }

  /**
   * Programmatic helper for other services to record audit logs internally
   */
  async record(data: {
    action: string;
    module: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action.trim().toUpperCase(),
        module: data.module.trim().toUpperCase(),
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }
}
