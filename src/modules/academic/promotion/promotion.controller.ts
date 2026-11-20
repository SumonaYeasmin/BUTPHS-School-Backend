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
    summary:
      "Preview students' promotion eligibility based on published annual exam results.",
    description:
      'Fetches all active students in a given class and optional section, integrates their published annual examination results, and provides suggested promotions, rolls, repeater flags, or graduation status for Class 10.',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion/Graduation preview generated successfully',
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

  @Post('execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Promote all eligible students in a selected class or section based on published results. (Admin only)',
    description:
      'Promote all eligible students in a selected class or section based on published results (or complete graduation for Class 10 terminal students).',
  })
  @ApiResponse({
    status: 201,
    description: 'Promotion/Graduation executed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed (missing target class for 6-9, incomplete results, or same academic year)',
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
  async executePromotion(@Body() dto: BulkPromotionDto) {
    return this.promotionService.promoteBulkStudents(dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get the list of previous student promotions with filters and pagination.',
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
    summary: "Get a student's complete promotion and academic history.",
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
