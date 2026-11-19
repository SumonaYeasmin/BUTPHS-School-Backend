import {
  Body,
  Controller,
  Delete,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamRoutineService } from './exam-routine.service';
import { QueryExamRoutineDto } from './dto/query-exam-routine.dto';
import { CreateExamRoutineDto } from './dto/create-exam-routine.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Exam Routines')
@Controller('examination/routines')
export class ExamRoutineController {
  constructor(private readonly examRoutineService: ExamRoutineService) {}

  @Post('exam/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Schedule a new exam routine slot (Admin only)',
    description:
      'Creates a scheduled exam slot with room assignment, time interval conflict validation, room double-booking validation, and exam date bounds checking.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiResponse({
    status: 201,
    description: 'Exam routine slot scheduled successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, date out of exam bounds, or startTime >= endTime',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam, subject, or section not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Time conflict: class or room already booked at this date and time, or subject already scheduled',
  })
  async create(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: CreateExamRoutineDto,
  ) {
    return this.examRoutineService.create(examId, dto);
  }

  @Get('exam/:examId')
  @ApiOperation({
    summary: 'Public API: Get full exam routine / timetable by Exam ID',
    description:
      'Public endpoint (no authentication required) for students, parents, and website visitors to view the official schedule, room numbers, subject marks, and instructions for a specific examination.',
  })
  @ApiParam({
    name: 'examId',
    description: 'Exam UUID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @ApiQuery({
    name: 'sectionId',
    required: false,
    description: 'Optional Section UUID to view section-specific room allocations',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam routine retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async getRoutineByExam(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.examRoutineService.getRoutineByExam(examId, sectionId);
  }

  @Get()
  @ApiOperation({
    summary: 'Public API: Search and filter exam routines',
    description:
      'Public endpoint (no auth required) allowing filtering of examination routines by academic year, class, exam, section, date range, or status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam routines retrieved successfully',
  })
  async findRoutines(@Query() query: QueryExamRoutineDto) {
    return this.examRoutineService.findRoutines(query);
  }

  @Delete(':routineId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft delete an exam routine slot (Admin only)',
    description:
      'Soft deletes a scheduled exam routine slot (sets isDeleted=true, deletedAt=now, status=CANCELLED). Prohibited if student marks are already recorded, if the exam has already taken place/concluded, if results are published, or if the exam is locked.',
  })
  @ApiParam({ name: 'routineId', description: 'Exam Routine UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exam routine slot soft deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete: marks entered, exam already conducted in past, results published, or exam is locked',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam routine slot not found',
  })
  async softDelete(@Param('routineId', ParseUUIDPipe) routineId: string) {
    return this.examRoutineService.softDelete(routineId);
  }
}
