import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
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
