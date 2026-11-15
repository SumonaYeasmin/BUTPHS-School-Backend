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
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Subjects')
@Controller('academic/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new subject in master catalog (Admin only)',
    description:
      'Creates a master subject entry with unique name and optional board code.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subject created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Subject name or board code already exists',
  })
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all subjects list (optionally search by name/code, filter by classId or targetClass)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subjects retrieved successfully',
  })
  async findAll(@Query() query: QuerySubjectDto) {
    return this.subjectService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subject details by ID',
    description:
      'Returns subject info, syllabus mappings across classes, and relation counts.',
  })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subject details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update subject details by ID (Admin only)',
    description:
      'Update subject name, board code, or description with uniqueness check.',
  })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Subject name or board code already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Safe delete a subject by ID (Admin only)',
    description:
      'Deletes subject only if not assigned to any class syllabus or exam.',
  })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete subject actively in use in classes or exams',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectService.remove(id);
  }
}
