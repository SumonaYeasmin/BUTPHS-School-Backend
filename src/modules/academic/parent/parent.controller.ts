import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ParentService } from './parent.service';
import { QueryParentDto } from './dto/query-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Parent Directory')
@Controller('academic/parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('check-existing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if parent already exists by phone or NID (for instant suggestion during admission)',
    description:
      'Checks if a parent already exists by phone or NID, and returns their profile with existing enrolled children for 1-click sibling linking.',
  })
  @ApiQuery({ name: 'phone', required: false, description: 'Parent phone number' })
  @ApiQuery({ name: 'nid', required: false, description: 'Parent National ID' })
  @ApiResponse({ status: 200, description: 'Check existing parent result returned' })
  async checkExisting(
    @Query('phone') phone?: string,
    @Query('nid') nid?: string,
  ) {
    return this.parentService.checkExisting(phone, nid);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all parents with search and pagination',
    description:
      'Search across parent name, phone, or NID. Returns paginated parents with their enrolled children count.',
  })
  @ApiResponse({ status: 200, description: 'Parents retrieved successfully' })
  async findAll(@Query() query: QueryParentDto) {
    return this.parentService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get details of a specific parent with linked children',
    description:
      'Returns parent profile and full list of all linked children, their current class, section, roll, and relationship.',
  })
  @ApiParam({ name: 'id', description: 'Parent UUID' })
  @ApiResponse({ status: 200, description: 'Parent details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update parent information (Admin only)',
    description: 'Update parent contact number, occupation, address, or NID.',
  })
  @ApiParam({ name: 'id', description: 'Parent UUID' })
  @ApiResponse({ status: 200, description: 'Parent updated successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParentDto,
  ) {
    return this.parentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a parent profile (Admin only)',
    description:
      'Permanently deletes a parent from directory. Only allowed if the parent currently has 0 linked students.',
  })
  @ApiParam({ name: 'id', description: 'Parent UUID' })
  @ApiResponse({ status: 200, description: 'Parent deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete parent with linked students',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.remove(id);
  }
}
