import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get paginated and filtered audit logs list (Admins only)',
    description:
      'Retrieves system audit logs with filtering by module, action, userId, date range, and free-text search with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs list retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can view audit logs',
  })
  async findAll(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get distinct modules present in audit logs (Admins only)',
    description:
      'Returns a list of all unique module names that currently have logged entries, ideal for frontend filter dropdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Distinct modules list retrieved successfully',
  })
  async getDistinctModules() {
    return this.auditLogService.getDistinctModules();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get single audit log entry detail by ID (Admins only)',
    description:
      'Retrieves complete detail of a specific audit log entry including user profile and roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit log detail retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit log entry not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findOne(id);
  }
}
