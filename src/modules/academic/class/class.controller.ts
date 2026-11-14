import {
  Body,
  Controller,
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
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Classes')
@Controller('academic/classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new school class (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Class created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Class name or numeric value already exists',
  })
  async create(@Body() dto: CreateClassDto) {
    return this.classService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all classes list with sections' })
  @ApiResponse({
    status: 200,
    description: 'Classes retrieved successfully',
  })
  async findAll() {
    return this.classService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get class details by ID' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  @ApiResponse({
    status: 200,
    description: 'Class details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.classService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update class details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Class UUID' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({
    status: 409,
    description: 'Class name or numeric value already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classService.update(id, dto);
  }
}
