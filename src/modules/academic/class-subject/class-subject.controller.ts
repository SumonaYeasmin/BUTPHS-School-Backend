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
import { ClassSubjectService } from './class-subject.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { QueryClassSubjectDto } from './dto/query-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Class Subjects')
@Controller('academic/class-subjects')
export class ClassSubjectController {
  constructor(private readonly classSubjectService: ClassSubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a subject to a class syllabus (Admin only)',
    description:
      'Maps a master subject to a school class and academic year, with optional/mandatory flag and group specialization.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subject assigned to class successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 404,
    description: 'Class, Subject or Group not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Subject is already assigned to this class and group',
  })
  async create(@Body() dto: CreateClassSubjectDto) {
    return this.classSubjectService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get list of class subjects (filter by classId, academicYearId, groupId, isOptional, search)',
  })
  @ApiResponse({
    status: 200,
    description: 'Class subjects retrieved successfully',
  })
  async findAll(@Query() query: QueryClassSubjectDto) {
    return this.classSubjectService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get class subject mapping details by ID',
    description:
      'Returns class subject syllabus details along with teacher assignments and counts.',
  })
  @ApiParam({ name: 'id', description: 'ClassSubject UUID' })
  @ApiResponse({
    status: 200,
    description: 'Class subject details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Class subject not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.classSubjectService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update class subject syllabus mapping by ID (Admin only)',
    description:
      'Update isOptional flag, reassign academic group, or change subject.',
  })
  @ApiParam({ name: 'id', description: 'ClassSubject UUID' })
  @ApiResponse({
    status: 200,
    description: 'Class subject updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Class subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate syllabus assignment detected',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassSubjectDto,
  ) {
    return this.classSubjectService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Safe remove a subject from class syllabus (Admin only)',
    description:
      'Removes subject from class syllabus only if there are no active teacher assignments.',
  })
  @ApiParam({ name: 'id', description: 'ClassSubject UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subject removed from class syllabus successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove subject: active teacher assignments exist',
  })
  @ApiResponse({ status: 404, description: 'Class subject not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.classSubjectService.remove(id);
  }
}
