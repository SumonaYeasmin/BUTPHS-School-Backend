import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { QueryPermissionDto } from '../dto/query-permission.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Auth - Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post('seed')
  @ApiOperation({
    summary: 'Seed standard school permissions (Admins only)',
    description:
      'Seeds all standard school management system permissions (academic, examination, attendance, staff, students, notice, audit, etc.) into the database.',
  })
  @ApiResponse({
    status: 201,
    description: 'Permissions seeded successfully',
  })
  async seedStandardPermissions() {
    return this.permissionService.seedStandardPermissions();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new permission (Admins only)',
    description:
      'Creates a new custom permission identifier (e.g. EXAM_CREATE, MARKS_ENTRY).',
  })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 400, description: 'Permission name already exists' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all permissions with pagination and search (Admins only)',
    description:
      'Retrieves the list of all defined permissions with assigned roles count.',
  })
  @ApiResponse({ status: 200, description: 'Permissions list retrieved successfully' })
  async findAll(@Query() query: QueryPermissionDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single permission detail by ID (Admins only)',
    description:
      'Retrieves permission details and the roles that have it assigned.',
  })
  @ApiResponse({ status: 200, description: 'Permission detail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findOne(id);
  }
}
