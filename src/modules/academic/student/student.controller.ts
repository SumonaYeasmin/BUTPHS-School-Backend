import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
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
}

