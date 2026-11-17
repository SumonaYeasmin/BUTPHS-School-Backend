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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { PreviewPromotionDto } from './dto/preview-promotion.dto';
import { BulkPromotionDto } from './dto/bulk-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import { GraduateBatchDto } from './dto/graduate-batch.dto';
import { RollbackBatchDto } from './dto/rollback-promotion.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Student Promotions')
@Controller('academic/promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get('preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Preview student promotion eligibility and suggested roll numbers',
    description:
      'Fetches all active students in a given class and optional section, integrates their published annual examination results, and provides suggested promotions, rolls, and repeater flags.',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion preview generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Section does not belong to the selected class',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year, class, or exam not found',
  })
  async preview(@Query() dto: PreviewPromotionDto) {
    return this.promotionService.previewPromotion(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Bulk promote an entire section of students using Annual Exam ResultSummaries (Admin only)',
    description:
      'Atomically executes year-end promotion for all students in a section based on published annual exam results: passed students are promoted to the target class and assigned sequential rolls (1, 2, 3...) according to merit position, while failed students are re-enrolled as repeaters in the source class.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk promotion processed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed (incomplete results, invalid classes/sections, or same academic year)',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year, class, section, or exam not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict detected (students already enrolled in target year, already promoted, or target roll collision)',
  })
  async promoteBulk(@Body() dto: BulkPromotionDto) {
    return this.promotionService.promoteBulkStudents(dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get paginated promotion records with filters (Admin & Teacher)',
    description:
      'Filter promotions by source/target academic year, source/target class, section, and search by student name or student ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion history retrieved successfully',
  })
  async getHistory(@Query() query: QueryPromotionDto) {
    return this.promotionService.getPromotionHistory(query);
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get full academic progression journey of a single student',
    description:
      'Returns the chronological timeline of all promotions, previous vs new classes/sections/rolls, and annual exam results for a specific student.',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiResponse({
    status: 200,
    description: 'Student promotion history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentHistory(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.promotionService.getStudentPromotionHistory(studentId);
  }

  @Post('graduate-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Graduate / complete an entire Class 10 batch (Admin only)',
    description:
      'Marks active Class 10 enrollments as COMPLETED and permanent student profiles as GRADUATED in an atomic transaction upon completion of school.',
  })
  @ApiResponse({
    status: 200,
    description: 'Class 10 batch graduated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed or class is not a terminal graduating class',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year, class, or section not found',
  })
  async graduateBatch(@Body() dto: GraduateBatchDto) {
    return this.promotionService.graduateBatch(dto);
  }

  @Post('rollback-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rollback / undo a batch promotion (Admin only)',
    description:
      'Reverts a batch promotion if no academic activity (attendance, marks, results) has taken place in the target class: deletes new enrollments, deletes promotion records, and restores source enrollments back to ACTIVE status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion rollback executed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Rollback blocked because students already have attendance or marks in target class',
  })
  @ApiResponse({
    status: 404,
    description: 'No matching promotion records found',
  })
  async rollbackBatch(@Body() dto: RollbackBatchDto) {
    return this.promotionService.rollbackBatch(dto);
  }
}
