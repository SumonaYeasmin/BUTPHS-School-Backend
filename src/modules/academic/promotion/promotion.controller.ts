import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { PreviewPromotionDto } from './dto/preview-promotion.dto';
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
}
