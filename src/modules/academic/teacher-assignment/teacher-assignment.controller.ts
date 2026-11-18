import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TeacherAssignmentService } from './teacher-assignment.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

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
}
