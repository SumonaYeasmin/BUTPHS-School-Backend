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
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Roles')
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
      'Creates a new role definition (e.g. TEACHER, ACCOUNTANT, LIBRARIAN).',
  })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Role with this name already exists' })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all roles with pagination and search (Admins only)',
    description:
      'Lists all defined roles along with assigned user count, search, and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Roles list retrieved successfully' })
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single role detail by ID (Admins only)',
    description: 'Retrieves role details and assigned user count.',
  })
  @ApiResponse({ status: 200, description: 'Role details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update role details (Admins only)',
    description: 'Updates role name or description.',
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or protected role rename' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a role (Admins only)',
    description:
      'Permanently deletes a role. Safeguarded: system roles (SUPER_ADMIN, ADMIN) and roles with assigned users cannot be deleted.',
  })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete: system role or has active users' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.delete(id);
  }

  @Post(':roleId/permissions')
  @ApiOperation({
    summary: 'Assign permissions to a role (Admins only)',
    description:
      'Assigns a list of permissions to a specified role. Duplicate assignments are safely ignored.',
  })
  @ApiResponse({ status: 201, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs provided' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async assignPermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(roleId, dto);
  }

  @Patch(':roleId/permissions')
  @ApiOperation({
    summary: 'Update/sync role permissions (Admins only)',
    description:
      'Replaces the current set of assigned permissions for this role with the provided list of permission UUIDs.',
  })
  @ApiResponse({ status: 200, description: 'Role permissions updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs provided' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.roleService.updateRolePermissions(roleId, dto);
  }

  @Get(':roleId/permissions')
  @ApiOperation({
    summary: 'Get assigned permissions of a role (Admins only)',
    description: 'Retrieves all permissions currently assigned to the given role.',
  })
  @ApiResponse({ status: 200, description: 'Assigned permissions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRolePermissions(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.roleService.getRolePermissions(roleId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @ApiOperation({
    summary: 'Revoke/remove a permission from a role (Admins only)',
    description: 'Removes an assigned permission from the specified role.',
  })
  @ApiResponse({ status: 200, description: 'Permission removed successfully' })
  @ApiResponse({ status: 404, description: 'Role or permission assignment not found' })
  async removePermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.roleService.removePermission(roleId, permissionId);
  }
}
