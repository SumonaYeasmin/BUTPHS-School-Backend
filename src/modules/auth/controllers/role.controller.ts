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
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Auth - Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new role (Admins only)',
    description:
      'Creates a new role (e.g. TEACHER, ACCOUNTANT, LIBRARIAN) with optional initial permissions list.',
  })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Role already exists or invalid permission IDs' })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all roles with pagination and search (Admins only)',
    description:
      'Lists all defined roles along with permission counts and assigned user counts.',
  })
  @ApiResponse({ status: 200, description: 'Roles list retrieved successfully' })
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  @Post('assign-user')
  @ApiOperation({
    summary: 'Assign role(s) to a user (Admins only)',
    description: 'Assigns one or more roles to a specific user.',
  })
  @ApiResponse({ status: 200, description: 'Roles assigned to user successfully' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRolesToUser(@Body() dto: AssignUserRoleDto) {
    return this.roleService.assignRolesToUser(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single role detail with full permissions list (Admins only)',
    description:
      'Fetches role details, all assigned permissions, and assigned user statistics.',
  })
  @ApiResponse({ status: 200, description: 'Role details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.findOne(id);
  }

  @Post(':id/permissions')
  @ApiOperation({
    summary: 'Assign permissions to a role (Admins only)',
    description:
      'Assigns permissions to an existing role without removing existing ones.',
  })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role or permission not found' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(id, dto);
  }
}
