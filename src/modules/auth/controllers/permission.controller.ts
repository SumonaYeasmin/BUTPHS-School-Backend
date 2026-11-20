import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { QueryPermissionDto } from '../dto/query-permission.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new permission (Admins only)',
    description:
      'Creates a new unique system permission identifier (e.g. EXAM_CREATE, MARKS_ENTRY, FEES_COLLECT).',
  })
  @ApiResponse({
    status: 201,
    description: 'Permission created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Permission with this name already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can create permissions',
  })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all permissions with pagination and search (Admins only)',
    description:
      'Retrieves the list of all defined permissions with name/description search and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions list retrieved successfully',
  })
  async findAll(@Query() query: QueryPermissionDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single permission detail by ID (Admins only)',
    description: 'Retrieves details of a specific permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission detail retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update permission details (Admins only)',
    description: 'Updates permission identifier name or description.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Permission with updated name already exists',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete permission with safeguards (Admins only)',
    description:
      'Deletes a permission record. Safeguarded: blocked if the permission is currently assigned to any active role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete: permission is currently assigned to active roles',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.delete(id);
  }
}
