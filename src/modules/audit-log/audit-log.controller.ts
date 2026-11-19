import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an audit log entry (Admins only)',
    description:
      'Records a system, security, or domain action in the audit trail. Automatically captures client IP and User-Agent if not provided in the payload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Audit log entry recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing required fields',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can record audit logs via API',
  })
  @ApiResponse({
    status: 404,
    description: 'Specified user was not found',
  })
  async create(
    @Body() dto: CreateAuditLogDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || req.ip;

    const clientUserAgent = req.headers['user-agent'];

    return this.auditLogService.create(
      dto,
      user,
      clientIp,
      clientUserAgent,
    );
  }
}
