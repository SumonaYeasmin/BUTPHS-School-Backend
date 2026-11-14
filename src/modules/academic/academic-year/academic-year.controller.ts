import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Academic Year')
@Controller('academic/years')
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new academic year (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Academic year created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 409, description: 'Academic year already exists' })
  async create(@Body() dto: CreateAcademicYearDto) {
    return this.academicYearService.create(dto);
  }
}

