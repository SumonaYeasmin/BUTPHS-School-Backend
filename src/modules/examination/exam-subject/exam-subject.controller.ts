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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamSubjectService } from './exam-subject.service';
import { CreateExamSubjectDto } from './dto/create-exam-subject.dto';
import { UpdateExamSubjectDto } from './dto/update-exam-subject.dto';
import { QueryExamSubjectDto } from './dto/query-exam-subject.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Exam Subjects')
@Controller('examination/exams/:examId/subjects')
export class ExamSubjectController {
  constructor(private readonly examSubjectService: ExamSubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a subject to an examination with marks breakdown (Admin only)',
    description:
      'Configures a subject for an examination with detailed marks breakdown (written, MCQ, practical, continuous assessment) with mathematical sum integrity checks and curriculum binding.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiResponse({
    status: 201,
    description: 'Exam subject configured successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, examination locked/completed, subject not in class curriculum, or component marks sum mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination, subject, or group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Subject already configured for this examination',
  })
  async create(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: CreateExamSubjectDto,
  ) {
    return this.examSubjectService.create(examId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all configured subjects for an examination',
    description:
      'Returns all subjects configured for an exam with marks breakdown, group distribution, and total marks summary.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exam subjects retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async findAllByExam(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query() query: QueryExamSubjectDto,
  ) {
    return this.examSubjectService.findAllByExam(examId, query);
  }

  @Get(':subjectConfigId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get specific exam subject details by ID',
    description:
      'Returns complete marks configuration, curriculum subject information, and associated counts.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiParam({ name: 'subjectConfigId', description: 'Exam Subject Config UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exam subject details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject configuration or Examination not found',
  })
  async findOne(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('subjectConfigId', ParseUUIDPipe) subjectConfigId: string,
  ) {
    return this.examSubjectService.findOne(examId, subjectConfigId);
  }

  @Patch(':subjectConfigId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update exam subject configuration (Admin only)',
    description:
      'Partially updates subject marks distribution, pass marks, or display order. Marks structure changes are blocked if student marks have already been recorded for this subject.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiParam({ name: 'subjectConfigId', description: 'Exam Subject Config UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exam subject configuration updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, exam locked/published, component sum mismatch, or marks already recorded',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject configuration or Examination not found',
  })
  async update(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('subjectConfigId', ParseUUIDPipe) subjectConfigId: string,
    @Body() dto: UpdateExamSubjectDto,
  ) {
    return this.examSubjectService.update(examId, subjectConfigId, dto);
  }

  @Delete(':subjectConfigId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a subject from an examination (Admin only)',
    description:
      'Removes a configured subject from an examination. Strictly prohibited if student marks have already been recorded, if scheduled in an exam routine, if results are published, or if the exam is locked.',
  })
  @ApiParam({ name: 'examId', description: 'Exam UUID' })
  @ApiParam({ name: 'subjectConfigId', description: 'Exam Subject Config UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exam subject removed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot remove: student marks recorded, scheduled in routine, results published, or exam is locked',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject configuration or Examination not found',
  })
  async remove(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('subjectConfigId', ParseUUIDPipe) subjectConfigId: string,
  ) {
    return this.examSubjectService.remove(examId, subjectConfigId);
  }
}
