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
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { QuerySectionDto } from './dto/query-section.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Sections')
@Controller('academic/sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new section under a class (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Section created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({
    status: 409,
    description: 'Section already exists in this class',
  })
  async create(@Body() dto: CreateSectionDto) {
    return this.sectionService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all sections list (optionally filtered by classId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sections retrieved successfully',
  })
  async findAll(@Query() query: QuerySectionDto) {
    return this.sectionService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get section details by ID' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({
    status: 200,
    description: 'Section details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update section details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  @ApiResponse({
    status: 409,
    description: 'Section already exists in this class',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a section by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete section with active enrollments, routines, or teacher assignments',
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionService.remove(id);
  }
}
