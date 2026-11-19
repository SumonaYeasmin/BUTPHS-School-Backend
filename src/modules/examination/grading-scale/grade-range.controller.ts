import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { GradingScaleService } from './grading-scale.service';
import { CreateGradeRangeDto } from './dto/create-grade-range.dto';
import { BulkCreateGradeRangeDto } from './dto/bulk-create-grade-range.dto';
import { UpdateGradeRangeDto } from './dto/update-grade-range.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Grade Ranges')
@Controller('examination/grading-scales/:scaleId/ranges')
export class GradeRangeController {
  constructor(private readonly gradingScaleService: GradingScaleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a single grade range to a grading scale (Admin only)',
    description:
      'Adds a new grade tier (e.g. 80-100% -> A+, 5.0) with duplicate letter and percentage interval overlap validation.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 201,
    description: 'Grade range added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or interval overlap detected',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Grade with this letter already exists in this scale',
  })
  async addGradeRange(
    @Param('scaleId', ParseUUIDPipe) scaleId: string,
    @Body() dto: CreateGradeRangeDto,
  ) {
    return this.gradingScaleService.addGradeRange(scaleId, dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk configure / replace all grade ranges for a scale (Admin only)',
    description:
      'Replaces all grade tiers of this scale atomically with full overlap validation.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 201,
    description: 'Grade ranges configured successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or interval overlap detected',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  async bulkAddGradeRanges(
    @Param('scaleId', ParseUUIDPipe) scaleId: string,
    @Body() dto: BulkCreateGradeRangeDto,
  ) {
    return this.gradingScaleService.bulkAddGradeRanges(scaleId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all grade ranges for a grading scale',
    description:
      'Returns all grade ranges configured under the specified grading scale, ordered from highest to lowest marks percentage.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grade ranges retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  async getGradeRanges(@Param('scaleId', ParseUUIDPipe) scaleId: string) {
    return this.gradingScaleService.getGradeRanges(scaleId);
  }

  @Get(':rangeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get specific grade range details by ID',
    description:
      'Returns single grade range details under the specified grading scale.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiParam({ name: 'rangeId', description: 'Grade Range UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grade range details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade range or Grading scale not found',
  })
  async getGradeRangeById(
    @Param('scaleId', ParseUUIDPipe) scaleId: string,
    @Param('rangeId', ParseUUIDPipe) rangeId: string,
  ) {
    return this.gradingScaleService.getGradeRangeById(scaleId, rangeId);
  }

  @Patch(':rangeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a specific grade range (Admin only)',
    description:
      'Partially updates a grade tier (marks percentage, letter grade, GPA, remarks). Enforces boundary validity, scale GPA limit, letter grade uniqueness, and interval overlap checks against other active ranges.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiParam({ name: 'rangeId', description: 'Grade Range UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grade range updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, system default scale, scale in active exam use, or interval overlap detected',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale or Grade range not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Grade with this letter already exists in this scale',
  })
  async updateGradeRange(
    @Param('scaleId', ParseUUIDPipe) scaleId: string,
    @Param('rangeId', ParseUUIDPipe) rangeId: string,
    @Body() dto: UpdateGradeRangeDto,
  ) {
    return this.gradingScaleService.updateGradeRange(scaleId, rangeId, dto);
  }

  @Delete(':rangeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft delete a grade range (Admin only)',
    description:
      'Soft deletes a grade range record (sets isDeleted=true, deletedAt=now). Blocked if the grading scale is system default or actively referenced by exams.',
  })
  @ApiParam({ name: 'scaleId', description: 'Grading Scale UUID' })
  @ApiParam({ name: 'rangeId', description: 'Grade Range UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grade range soft deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete range: scale is system default or actively used by examinations',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale or Grade range not found',
  })
  async softDeleteGradeRange(
    @Param('scaleId', ParseUUIDPipe) scaleId: string,
    @Param('rangeId', ParseUUIDPipe) rangeId: string,
  ) {
    return this.gradingScaleService.softDeleteGradeRange(scaleId, rangeId);
  }
}
