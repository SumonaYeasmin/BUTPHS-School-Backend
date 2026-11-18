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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffStructureService } from './staff-structure.service';
import { CreateStaffStructureDto } from './dto/create-staff-structure.dto';
import { UpdateStaffStructureDto } from './dto/update-staff-structure.dto';
import { QueryStaffStructureDto } from './dto/query-staff-structure.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Staff & HR) Staff Structure (জনবল কাঠামো)')
@Controller('staff/structures')
export class StaffStructureController {
  constructor(private readonly structureService: StaffStructureService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an approved post / sanctioned position (Admin only)',
    description:
      'Defines an approved post (e.g. সহকারী শিক্ষক, প্রধান শিক্ষক, হিসাবরক্ষক) with its total sanctioned quota and department.',
  })
  @ApiResponse({
    status: 201,
    description: 'Approved post created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Designation with this staffType already exists',
  })
  async create(@Body() dto: CreateStaffStructureDto) {
    return this.structureService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all approved posts with real-time filled & vacant counts',
    description:
      'Returns the full Staff Structure table with live counts of active employees and vacancies. Used for the public website and dropdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff structures retrieved successfully',
  })
  async findAll(@Query() query: QueryStaffStructureDto) {
    return this.structureService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single approved post details with assigned active staff',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the staff structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff structure details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff structure not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.structureService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update approved post quota or details (Admin only)',
    description:
      'Updates post designation, quota, or department. Blocks quota reduction if active staff count exceeds new quota.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the staff structure to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff structure updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot reduce quota below currently active staff count',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff structure not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Designation with this staffType already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffStructureDto,
  ) {
    return this.structureService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete an approved post (Admin only)',
    description:
      'Marks the post as soft-deleted (isDeleted = true). Blocks deletion if any active staff are currently occupying this post.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the staff structure to soft-delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff structure soft-deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete post with active assigned staff',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff structure not found',
  })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.structureService.softDelete(id);
  }
}
