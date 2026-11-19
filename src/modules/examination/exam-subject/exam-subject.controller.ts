import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
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
import { ExamSubjectService } from './exam-subject.service';
import { CreateExamSubjectDto } from './dto/create-exam-subject.dto';
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
}
