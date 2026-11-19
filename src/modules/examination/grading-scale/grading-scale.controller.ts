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
import { GradingScaleService } from './grading-scale.service';
import { CreateGradingScaleDto } from './dto/create-grading-scale.dto';
import { UpdateGradingScaleDto } from './dto/update-grading-scale.dto';
import { QueryGradingScaleDto } from './dto/query-grading-scale.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Examination) Grading Scales')
@Controller('examination/grading-scales')
export class GradingScaleController {
  constructor(private readonly gradingScaleService: GradingScaleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new grading scale (Admin only)',
    description:
      'Creates a grading scale policy (e.g. NCTB Secondary GPA 5.0) with optional initial grade ranges atomically.',
  })
  @ApiResponse({
    status: 201,
    description: 'Grading scale created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or percentage overlap in grade ranges',
  })
  @ApiResponse({
    status: 409,
    description: 'Grading scale with this name already exists',
  })
  async create(@Body() dto: CreateGradingScaleDto) {
    return this.gradingScaleService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all grading scales (Paginated with search and active filter)',
    description:
      'Returns a paginated list of all grading scales along with range counts and associated exam counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grading scales retrieved successfully',
  })
  async findAll(@Query() query: QueryGradingScaleDto) {
    return this.gradingScaleService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get grading scale details by UUID',
    description:
      'Returns complete grading scale configuration including all ordered grade ranges and linked exams count.',
  })
  @ApiParam({ name: 'id', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grading scale details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradingScaleService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update grading scale details or replace grade ranges (Admin only)',
    description:
      'Updates grading scale name, description, maxGpa, default flag, or atomically replaces grade ranges with interval overlap validation.',
  })
  @ApiParam({ name: 'id', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grading scale updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, scale in use, or cannot modify system default',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Another grading scale with the new name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradingScaleDto,
  ) {
    return this.gradingScaleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft delete grading scale by UUID (Admin only)',
    description:
      'Marks the grading scale as deleted (isDeleted: true) and deactivates it. Protected against deleting system default scales, active default scale, or scales used by active exams.',
  })
  @ApiParam({ name: 'id', description: 'Grading Scale UUID' })
  @ApiResponse({
    status: 200,
    description: 'Grading scale soft deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete default scale or scale in active use by exams',
  })
  @ApiResponse({
    status: 404,
    description: 'Grading scale not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradingScaleService.softDelete(id);
  }
}
