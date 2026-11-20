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
import { UserService } from '../services/user.service';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Users & User Roles')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'List all users with pagination, search, and role filter (Admins only)',
    description:
      'Retrieves users list along with their assigned roles. Supports searching by name/email/phone and filtering by role.',
  })
  @ApiResponse({ status: 200, description: 'Users list retrieved successfully' })
  async findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single user detail with assigned roles and permissions (Admins only)',
    description: 'Retrieves user details including their active roles and permissions.',
  })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Post(':userId/roles')
  @ApiOperation({
    summary: 'Assign roles to a user (Admins only)',
    description:
      'Assigns one or more roles to a user (additive). Duplicate roles are safely ignored.',
  })
  @ApiResponse({ status: 201, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role IDs provided' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.userService.assignRoles(userId, dto);
  }

  @Patch(':userId/roles')
  @ApiOperation({
    summary: 'Update/sync user roles (Admins only)',
    description:
      'Replaces the current set of assigned roles for this user with the provided list of role UUIDs.',
  })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role IDs provided' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.userService.updateUserRoles(userId, dto);
  }

  @Get(':userId/roles')
  @ApiOperation({
    summary: 'Get assigned roles of a user (Admins only)',
    description: 'Retrieves all roles and permissions currently assigned to the given user.',
  })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserRoles(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.userService.getUserRoles(userId);
  }

  @Delete(':userId/roles/:roleId')
  @ApiOperation({
    summary: 'Revoke/remove a role from a user (Admins only)',
    description: 'Removes an assigned role from the specified user.',
  })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Role assignment not found' })
  async removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.userService.removeRole(userId, roleId);
  }
}
