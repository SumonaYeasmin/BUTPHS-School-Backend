import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClassSubjectService } from './class-subject.service';
import { AssignClassSubjectDto } from './dto/assign-class-subject.dto';
import { RolloverClassSubjectDto } from './dto/rollover-class-subject.dto';
import { QueryClassSubjectDto } from './dto/query-class-subject.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Class Subjects & Curriculum')
@Controller('academic/class-subjects')
export class ClassSubjectController {
  constructor(private readonly classSubjectService: ClassSubjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a subject to a class for an academic year (Admin only)',
    description:
      'Assigns a master subject to a class, academic year, and optional academic group.',
  })
  @ApiResponse({ status: 201, description: 'Subject assigned successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Subject already assigned to this class and group',
  })
  async assign(@Body() dto: AssignClassSubjectDto) {
    return this.classSubjectService.assign(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all class subjects (filterable by year, class, group, status)',
  })
  @ApiResponse({
    status: 200,
    description: 'Class subjects retrieved successfully',
  })
  async findAll(@Query() query: QueryClassSubjectDto) {
    return this.classSubjectService.findAll(query);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate or deactivate a class subject (Admin only)',
    description:
      'Safely enable or disable a subject for a class without deleting records.',
  })
  @ApiParam({ name: 'id', description: 'ClassSubject UUID' })
  @ApiQuery({ name: 'isActive', type: Boolean, example: true })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isActive') isActive: boolean,
  ) {
    return this.classSubjectService.toggleActive(id, String(isActive) === 'true');
  }

  @Post('rollover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yearly Curriculum Rollover (Admin only)',
    description:
      'Copies all active subjects from a previous academic year to a new academic year in one click.',
  })
  @ApiResponse({
    status: 200,
    description: 'Curriculum rolled over successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid academic years or no source subjects',
  })
  async rollover(@Body() dto: RolloverClassSubjectDto) {
    return this.classSubjectService.rollover(dto);
  }

  @Get('public/curriculum/:classId')
  @ApiOperation({
    summary:
      'Public Website API: Get Curriculum & Prescribed Books for a Class',
    description:
      'Public endpoint (no auth required) returning subjects grouped by category with their textbooks and supplementary books.',
  })
  @ApiParam({ name: 'classId', description: 'School Class UUID' })
  @ApiQuery({
    name: 'academicYearId',
    required: false,
    description: 'Optional Academic Year UUID (defaults to current active year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Curriculum and booklist retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Class or academic year not found' })
  async getPublicCurriculum(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.classSubjectService.getPublicCurriculum(
      classId,
      academicYearId,
    );
  }
}
