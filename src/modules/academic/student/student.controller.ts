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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Students')
@Controller('academic/students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admit and enroll a new student (Admin only)',
    description:
      'Creates a permanent student profile and initial class enrollment in an atomic transaction.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student admitted and enrolled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or section does not belong to class',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year, class, section, or group not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student ID, Roll number, Birth Certificate, or RFID card already in use',
  })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get paginated list of students with filtering and search',
    description:
      'Filter by academicYearId, classId, sectionId, status, and search by name/ID/birth certificate.',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
  })
  async findAll(@Query() query: QueryStudentDto) {
    return this.studentService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get single student full profile by ID',
    description:
      'Includes personal info, complete enrollment history, parent details, and promotion history.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update student profile and active enrollment details (Admin only)',
    description:
      'Updates personal information and optionally corrects active section, group, or roll number.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({
    status: 409,
    description:
      'Duplicate roll number, birth certificate, or RFID card number',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete a student (Soft delete by default, Hard delete with ?permanent=true)',
    description:
      'By default, marks student as INACTIVE (soft delete). With ?permanent=true, permanently removes from database only if student has zero academic history (marks/attendances).',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiQuery({
    name: 'permanent',
    required: false,
    type: Boolean,
    description:
      'Permanently delete from database (only allowed if zero academic history)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot permanently delete student with existing academic history',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ) {
    const isPermanent = permanent === 'true';
    return this.studentService.remove(id, isPermanent);
  }

  @Post(':id/parents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link or add a parent/guardian to a student (Admin only)',
    description:
      'Associates a parent with a student. Can link an existing parent by parentId (for siblings) or create a new parent profile in one request.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiResponse({
    status: 201,
    description: 'Parent linked to student successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing required fields',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or Parent not found',
  })
  @ApiResponse({
    status: 409,
    description: 'This parent is already linked to the student',
  })
  async assignParent(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: AssignParentDto,
  ) {
    return this.studentService.assignParent(studentId, dto);
  }

  @Get(':id/parents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all parents/guardians of a student',
    description:
      'Returns list of all linked parents/guardians, their relationship (FATHER, MOTHER, GUARDIAN), contact details, and primary contact status.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student parents retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentParents(@Param('id', ParseUUIDPipe) studentId: string) {
    return this.studentService.getStudentParents(studentId);
  }
}
