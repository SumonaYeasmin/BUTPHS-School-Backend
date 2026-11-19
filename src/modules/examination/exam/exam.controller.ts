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
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamRoutineService } from '../exam-routine/exam-routine.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Exams')
@Controller('examination/exams')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examRoutineService: ExamRoutineService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new examination (Admin only)',
    description:
      'Creates a new examination for a specific class and academic year with complete domain validations (academic year bounds, weightage limit, scale ranges check, duplicate exam name check).',
  })
  @ApiResponse({
    status: 201,
    description: 'Examination created successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, invalid date range, weightage overflow, or inactive dependencies',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year, class, or grading scale not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'An examination with this name already exists for this class in the selected academic year',
  })
  async create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }

  @Get(':examId/routine')
  @ApiOperation({
    summary: 'Public API: Get examination routine / timetable',
    description:
      'Public endpoint (no auth required) returning the official examination timetable, room arrangements, and marks distribution for students, parents, and visitors.',
  })
  @ApiParam({
    name: 'examId',
    description: 'Exam UUID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @ApiQuery({
    name: 'sectionId',
    required: false,
    description: 'Optional Section UUID filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam routine retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async getExamRoutine(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.examRoutineService.getRoutineByExam(examId, sectionId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an examination (Admin only)',
    description:
      'Partially updates an existing examination with safety guards (locked status, published results, grading scale validity, dates within academic year, weightage threshold, and name uniqueness).',
  })
  @ApiParam({ name: 'id', description: 'Exam UUID' })
  @ApiResponse({
    status: 200,
    description: 'Examination updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, examination locked, published results restriction, or weightage overflow',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination or referenced entity not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Another examination with this name already exists in this class and academic year',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft delete an examination (Admin only)',
    description:
      'Soft deletes an examination (sets isDeleted=true, deletedAt=now, status=CANCELLED). Prohibited if results are published, if exam is locked, or if student marks are already recorded.',
  })
  @ApiParam({ name: 'id', description: 'Exam UUID' })
  @ApiResponse({
    status: 200,
    description: 'Examination soft deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete: exam is locked, results are already published, or student marks are recorded',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.examService.softDelete(id);
  }
}
