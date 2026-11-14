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
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
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

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all academic years list' })
  @ApiResponse({
    status: 200,
    description: 'Academic years retrieved successfully',
  })
  async findAll() {
    return this.academicYearService.findAll();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently active running academic year' })
  @ApiResponse({
    status: 200,
    description: 'Current academic year retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No active academic year found',
  })
  async findCurrent() {
    return this.academicYearService.findCurrent();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get academic year details by ID' })
  @ApiParam({ name: 'id', description: 'Academic Year UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicYearService.findOne(id);
  }

  @Patch(':id/set-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set this academic year as the current active year (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Academic Year UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year set as active successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  async setActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicYearService.setActive(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an academic year by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic Year UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({ status: 409, description: 'Academic year name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicYearService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an academic year by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Academic Year UUID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete active year or year with relations',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicYearService.remove(id);
  }
}
