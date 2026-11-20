import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResultProcessingService } from './result-processing.service';
import { ProcessResultDto } from './dto/process-result.dto';
import { QueryTabulationSheetDto } from './dto/query-tabulation-sheet.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('(Examination) Results & Tabulation')
@Controller('examination/results')
export class ResultProcessingController {
  constructor(
    private readonly resultProcessingService: ResultProcessingService,
  ) {}

  @Post('process/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process and calculate examination results (Admins only)',
    description:
      'Calculates subject grades, 4th subject bonus points, total GPA, pass/fail status, and class/section merit positions in an atomic transaction.',
  })
  @ApiResponse({
    status: 200,
    description: 'Results processed and tabulated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot process: exam cancelled, published without force flag, or grading scale has no grade ranges',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can process examination results',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async processExamResults(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: ProcessResultDto,
    @CurrentUser() user: any,
  ) {
    return this.resultProcessingService.processExamResults(examId, dto, user);
  }

  @Get('tabulation-sheet/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get master tabulation sheet / merit list for an examination',
    description:
      'Retrieves the full class tabulation matrix with subject scores, grades, overall GPA, merit position, pass/fail statistics, and section filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tabulation sheet retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async getTabulationSheet(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query() query: QueryTabulationSheetDto,
  ) {
    return this.resultProcessingService.getTabulationSheet(examId, query);
  }

  @Get('student/:enrollmentId/exam/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get individual student academic transcript / report card',
    description:
      'Retrieves a print-ready marksheet including subject marks, grades, grade points, overall GPA, class & section rank, and grading scale legend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student transcript retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Result summary not found for this student and examination',
  })
  async getStudentTranscript(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.resultProcessingService.getStudentTranscript(
      enrollmentId,
      examId,
    );
  }

  @Patch('publish/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish examination results to student/parent portal (Admins only)',
    description:
      'Officially releases exam results to students and parents, timestamps publication, and seals all marks from further modifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Results officially published successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Results have not been processed yet',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can publish exam results',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async publishResults(
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultProcessingService.publishResults(examId, user);
  }

  @Patch('withhold/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Withhold examination results (Admins only)',
    description:
      'Temporarily suspends publication of results if discrepancies or audit checks are required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Results placed on withheld status',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Only administrators can withhold results',
  })
  @ApiResponse({
    status: 404,
    description: 'Examination not found',
  })
  async withholdResults(
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: any,
  ) {
    return this.resultProcessingService.withholdResults(examId, user);
  }
}
