import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AcademicGroupService } from './academic-group.service';
import { CreateAcademicGroupDto } from './dto/create-academic-group.dto';
import { UpdateAcademicGroupDto } from './dto/update-academic-group.dto';
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

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all academic groups' })
  @ApiResponse({
    status: 200,
    description: 'Academic groups retrieved successfully',
  })
  async findAll() {
    return this.academicGroupService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get academic group details by ID' })
  @ApiParam({ name: 'id', description: 'Academic group UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic group details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic group not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicGroupService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update academic group details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic group UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic group updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Academic group not found' })
  @ApiResponse({
    status: 409,
    description: 'Academic group with this name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicGroupDto,
  ) {
    return this.academicGroupService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an academic group by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic group UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic group deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete academic group with active enrollments or assigned subjects',
  })
  @ApiResponse({ status: 404, description: 'Academic group not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicGroupService.remove(id);
  }
}
