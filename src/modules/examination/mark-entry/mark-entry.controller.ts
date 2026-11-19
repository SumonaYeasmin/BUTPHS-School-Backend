import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MarkEntryService } from './mark-entry.service';
import { CreateMarkDto } from './dto/create-mark.dto';
import { BulkCreateMarkDto } from './dto/bulk-create-mark.dto';
import { QueryGradeSheetDto } from './dto/query-grade-sheet.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('(Examination) Mark Entry')
@Controller('examination/marks')
export class MarkEntryController {
  constructor(private readonly markEntryService: MarkEntryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enter or update marks for a single student (Teachers / Admins)',
    description:
      'Enters written, MCQ, practical, or continuous assessment marks for a student. Enforces subject teacher assignment, section authorization, deadline check, absent logic, lock protection, and component marks range bounds.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student mark recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, mark exceeds component max, exam locked, results published, deadline passed, or marks locked',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: Teacher is not assigned to this subject/section or lacks mark entry rights',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject or student enrollment not found',
  })
  async createSingleMark(
    @Body() dto: CreateMarkDto,
    @CurrentUser() user: any,
  ) {
    return this.markEntryService.createSingleMark(dto, user);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk enter marks for an entire class / section (Teachers / Admins)',
    description:
      'Atomically records or updates marks for an entire section/class. Verifies teacher assignment rights per section, component marks limits, exam deadline, and absent status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk marks processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or scores out of bounds',
  })
  @ApiResponse({
    status: 403,
    description: 'Teacher not authorized for one or more sections in batch',
  })
  async createBulkMarks(
    @Body() dto: BulkCreateMarkDto,
    @CurrentUser() user: any,
  ) {
    return this.markEntryService.createBulkMarks(dto, user);
  }

  @Get('grade-sheet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get grade sheet mark entry table for teachers/admins',
    description:
      'Retrieves the list of enrolled students for an exam subject, along with any existing marks entered, component breakdowns, statistics, and permission checking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade sheet retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: Teacher is not assigned to teach this subject in this class/section',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject or examination not found',
  })
  async getGradeSheet(
    @Query() query: QueryGradeSheetDto,
    @CurrentUser() user: any,
  ) {
    return this.markEntryService.getGradeSheet(query, user);
  }

  @Get('student/:enrollmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all exam marks for a specific student enrollment',
    description:
      'Retrieves all subject marks recorded for a student enrollment, optionally filtered by examination ID.',
  })
  @ApiQuery({
    name: 'examId',
    required: false,
    description: 'Optional Exam UUID filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Student marks retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student enrollment not found',
  })
  async getStudentMarks(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query('examId') examId?: string,
  ) {
    return this.markEntryService.getStudentMarks(enrollmentId, examId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get single mark entry detail by ID',
    description:
      'Fetches complete details of a mark record including student info, subject details, exam info, and the user who entered the mark.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mark entry details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Mark record not found',
  })
  async getMarkById(@Param('id', ParseUUIDPipe) id: string) {
    return this.markEntryService.getMarkById(id);
  }
}
