import {
  Body,
  Controller,
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
import { StaffMemberService } from './staff-member.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Staff & HR) Staff Members (শিক্ষক, কর্মকর্তা ও কর্মচারী)')
@Controller('staff')
export class StaffMemberController {
  constructor(private readonly staffMemberService: StaffMemberService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create / Recruit a new staff member (Admin only)',
    description:
      'Creates a new staff member profile (Teacher, Officer, or Employee). Auto-generates employee ID if omitted, validates NID uniqueness, and auto-inherits designation from Staff Structure.',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff member created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or post quota is already full',
  })
  @ApiResponse({
    status: 404,
    description: 'Department or Staff Structure post not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Employee ID or NID already in use',
  })
  async create(@Body() dto: CreateStaffDto) {
    return this.staffMemberService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List staff members with search, department/type filters, and pagination',
    description:
      'Retrieves staff list ordered by seniority (displayOrder). Supports filtering by staffType (TEACHER, OFFICER, EMPLOYEE), isFormer (প্রাক্তন শিক্ষক/কর্মচারী), departmentId, employmentType, status, and multi-field keyword search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
  })
  async findAll(@Query() query: QueryStaffDto) {
    return this.staffMemberService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get HR & staff summary statistics for dashboard',
    description:
      'Returns aggregate counts of active teachers, officers, employees, former teachers, and employment breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff statistics retrieved successfully',
  })
  async getStatistics() {
    return this.staffMemberService.getStatistics();
  }

  @Get('employee-id/:employeeId')
  @ApiOperation({
    summary: 'Get single staff profile by sequential Employee ID (e.g. T-2026-0001)',
  })
  @ApiParam({
    name: 'employeeId',
    description: 'Sequential employee ID of the staff member (e.g. T-2026-0001, OFF-2026-0002)',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff profile retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff member with specified employee ID not found',
  })
  async findByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.staffMemberService.findByEmployeeId(employeeId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single staff profile by UUID with assigned classes and routines',
    description:
      'Returns comprehensive staff profile including department, approved post, assigned classes/subjects, and class routines.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the staff member',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff profile details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff member not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffMemberService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update staff member profile (Admin only)',
    description:
      'Updates staff personal details, department, approved post, designation, or status with complete safety checks (NID/Employee ID uniqueness, quota checks, auto leaving date).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the staff member to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff member updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or target post quota is full',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff member, Department, or Staff Structure not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Employee ID or NID already in use by another staff member',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffMemberService.update(id, dto);
  }
}
