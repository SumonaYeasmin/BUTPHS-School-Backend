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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffMemberService } from './staff-member.service';
import { CreateStaffDto } from './dto/create-staff.dto';
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
      'Retrieves staff list ordered by seniority (displayOrder). Used for public website (শিক্ষক, কর্মকর্তা, কর্মচারী, প্রাক্তন শিক্ষকবৃন্দ) and admin panels.',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
  })
  async findAll(@Query() query: QueryStaffDto) {
    return this.staffMemberService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single staff profile by ID with assigned classes and routines',
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
}
