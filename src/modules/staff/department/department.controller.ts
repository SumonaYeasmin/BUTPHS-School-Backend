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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Staff & HR) Departments')
@Controller('staff/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new department (Admin only)',
    description:
      'Creates a new department (e.g., বিজ্ঞান বিভাগ, Accounts, Office Management) with optional code and display order.',
  })
  @ApiResponse({
    status: 201,
    description: 'Department created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Department name or code already exists',
  })
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all departments with search, status filtering, and pagination',
    description:
      'Retrieves all departments ordered by display order ascending. Used for website department lists and staff entry dropdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of departments retrieved successfully',
  })
  async findAll(@Query() query: QueryDepartmentDto) {
    return this.departmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get department details by ID with linked staff and structure counts',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department',
  })
  @ApiResponse({
    status: 200,
    description: 'Department details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update department details (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Department updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Department name or code already taken by another department',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete department (Admin only)',
    description:
      'Safely deletes a department only if no staff or sanctioned posts are attached. Otherwise suggests setting status to INACTIVE.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the department to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete department with active linked staff or approved posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.remove(id);
  }
}
