import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Prescribed Books')
@Controller('academic/books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a new prescribed book for a class & subject (Admin only)',
    description:
      'Creates a textbook, supplementary reader, or grammar book for a specific class and subject.',
  })
  @ApiResponse({ status: 201, description: 'Book created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Class or Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Book with this name already exists for this class and subject',
  })
  async create(@Body() dto: CreateBookDto) {
    return this.bookService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all prescribed books (filterable by class, subject, type, search)',
    description:
      'Returns a list of books sorted by class numeric value and display order.',
  })
  @ApiResponse({ status: 200, description: 'Books retrieved successfully' })
  async findAll(@Query() query: QueryBookDto) {
    return this.bookService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get book details by ID' })
  @ApiParam({ name: 'id', description: 'Book UUID' })
  @ApiResponse({ status: 200, description: 'Book details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookService.findOne(id);
  }
}

