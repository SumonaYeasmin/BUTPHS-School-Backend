import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MarkEntryService } from './mark-entry.service';
import { CreateMarkDto } from './dto/create-mark.dto';
import { BulkCreateMarkDto } from './dto/bulk-create-mark.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('(Examination) Mark Entry')
@Controller('examination/marks')
export class MarkEntryController {
  constructor(private readonly markEntryService: MarkEntryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enter or update marks for a single student (Teachers / Admins)',
    description:
      'Enters written, MCQ, practical, or continuous assessment marks for a student. Enforces subject teacher assignment, section authorization, deadline check, absent logic, lock protection, and component marks range bounds.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student mark recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, mark exceeds component max, exam locked, results published, deadline passed, or marks locked',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: Teacher is not assigned to this subject/section or lacks mark entry rights',
  })
  @ApiResponse({
    status: 404,
    description: 'Exam subject or student enrollment not found',
  })
  async createSingleMark(
    @Body() dto: CreateMarkDto,
    @CurrentUser() user: any,
  ) {
    return this.markEntryService.createSingleMark(dto, user);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk enter marks for an entire class / section (Teachers / Admins)',
    description:
      'Atomically records or updates marks for an entire section/class. Verifies teacher assignment rights per section, component marks limits, exam deadline, and absent status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk marks processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or scores out of bounds',
  })
  @ApiResponse({
    status: 403,
    description: 'Teacher not authorized for one or more sections in batch',
  })
  async createBulkMarks(
    @Body() dto: BulkCreateMarkDto,
    @CurrentUser() user: any,
  ) {
    return this.markEntryService.createBulkMarks(dto, user);
  }
}
