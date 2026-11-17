import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { PreviewPromotionDto } from './dto/preview-promotion.dto';
import { BulkPromotionDto } from './dto/bulk-promotion.dto';
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
}
