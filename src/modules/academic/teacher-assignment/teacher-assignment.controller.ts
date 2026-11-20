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
import { TeacherAssignmentService } from './teacher-assignment.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { UpdateTeacherAssignmentDto } from './dto/update-teacher-assignment.dto';
import { ReleaseTeacherDto } from './dto/release-teacher.dto';
import { QueryTeacherAssignmentDto } from './dto/query-teacher-assignment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('(Academic) Teacher Assignment (বিষয় শিক্ষক নিয়োগ ও দায়িত্ব বণ্টন)')
@Controller('academic/teacher-assignments')
export class TeacherAssignmentController {
  constructor(
    private readonly teacherAssignmentService: TeacherAssignmentService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a teacher to a subject in a class/section (Admin only)',
    description:
      'Assigns an active teacher to teach a subject. Contains conflict protection: prevents mistakenly assigning 2 teachers to the same subject simultaneously. Supports "replaceExisting: true" to automatically hand over from an old teacher to a new one.',
  })
  @ApiResponse({
    status: 201,
    description: 'Teacher assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed or another teacher is already actively assigned to this subject',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher, Academic Year, Class, Section, or Subject not found',
  })
  @ApiResponse({
    status: 409,
    description: 'The specified teacher is already actively assigned to this subject',
  })
  async assign(@Body() dto: AssignTeacherDto) {
    return this.teacherAssignmentService.assign(dto);
  }

  @Get('my-assignments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get assigned classes & subjects for the logged-in teacher',
    description:
      'Retrieves the list of active classes, sections, and subjects assigned to the currently authenticated teacher for routine view and mark entry.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher assigned subjects retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff profile not linked with this user account',
  })
  async getMyAssignments(@CurrentUser() user: { id: string }) {
    return this.teacherAssignmentService.getMyAssignments(user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List teacher assignments with filters and pagination',
    description:
      'Filter by Academic Year, Class, Section, Teacher, or active status (isActive: true/false).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of teacher assignments retrieved successfully',
  })
  async findAll(@Query() query: QueryTeacherAssignmentDto) {
    return this.teacherAssignmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single teacher assignment details with class routines',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the TeacherAssignment',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher assignment details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher assignment not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update teacher assignment details (Admin only)',
    description:
      'Transfers assignment to a new teacher, toggles marks entry permissions, or re-activates an inactive assignment with conflict checks.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the TeacherAssignment to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher assignment updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed or another teacher is already actively assigned to this subject',
  })
  @ApiResponse({
    status: 404,
    description: 'TeacherAssignment or new Staff not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeacherAssignmentDto,
  ) {
    return this.teacherAssignmentService.update(id, dto);
  }

  @Patch(':id/release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Release / Relieve a teacher from an active assignment (Admin only)',
    description:
      'Ends a teacher’s active assignment (for leave, transfer, or departure) while preserving all historical routines and grading logs.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the TeacherAssignment record',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher released successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Teacher is already released or inactive',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher assignment record not found',
  })
  async release(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseTeacherDto,
  ) {
    return this.teacherAssignmentService.release(id, dto);
  }
}
