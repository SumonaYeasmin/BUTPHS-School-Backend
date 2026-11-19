import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Exams')
@Controller('examination/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

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
}
