import {
  Body,
  Controller,
  Post,
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
}
