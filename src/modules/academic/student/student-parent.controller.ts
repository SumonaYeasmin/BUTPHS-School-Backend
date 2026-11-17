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
import { StudentService } from './student.service';
import { AssignParentDto } from './dto/assign-parent.dto';
import { UpdateStudentParentDto } from './dto/update-student-parent.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Student Parents')
@Controller('academic/students/:studentId/parents')
export class StudentParentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link or add a parent/guardian to a student (Admin only)',
    description:
      'Associates a parent with a student. Can link an existing parent by parentId (for siblings) or create a new parent profile in one request.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
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
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: AssignParentDto,
  ) {
    return this.studentService.assignParent(studentId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all parents/guardians of a student',
    description:
      'Returns list of all linked parents/guardians, their relationship (FATHER, MOTHER, GUARDIAN), contact details, and primary contact status.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student parents retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentParents(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentService.getStudentParents(studentId);
  }

  @Patch(':parentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update parent relationship or primary status (Admin only)',
    description:
      'Updates the relationship type (FATHER, MOTHER, GUARDIAN) or promotes this parent to primary contact (automatically resets other primary contacts).',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiParam({ name: 'parentId', description: 'Parent UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student parent relationship updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Relationship mapping not found' })
  async updateStudentParent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Body() dto: UpdateStudentParentDto,
  ) {
    return this.studentService.updateStudentParent(studentId, parentId, dto);
  }

  @Delete(':parentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unlink a parent from a student (Admin only)',
    description:
      'Removes the relationship mapping between the student and parent without deleting the parent profile itself.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiParam({ name: 'parentId', description: 'Parent UUID' })
  @ApiResponse({
    status: 200,
    description: 'Parent unlinked from student successfully',
  })
  @ApiResponse({ status: 404, description: 'Relationship mapping not found' })
  async removeStudentParent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
  ) {
    return this.studentService.removeStudentParent(studentId, parentId);
  }
}
