import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AcademicGroupService } from './academic-group.service';
import { CreateAcademicGroupDto } from './dto/create-academic-group.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Academic Groups')
@Controller('academic/groups')
export class AcademicGroupController {
  constructor(private readonly academicGroupService: AcademicGroupService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new academic group (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Academic group created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Academic group with this name already exists',
  })
  async create(@Body() dto: CreateAcademicGroupDto) {
    return this.academicGroupService.create(dto);
  }
}

