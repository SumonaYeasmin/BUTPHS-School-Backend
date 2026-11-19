import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamRoutineService } from './exam-routine.service';
import { QueryExamRoutineDto } from './dto/query-exam-routine.dto';

@ApiTags('(Examination) Exam Routines (Public)')
@Controller('examination/routines')
export class ExamRoutineController {
  constructor(private readonly examRoutineService: ExamRoutineService) {}

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
}
