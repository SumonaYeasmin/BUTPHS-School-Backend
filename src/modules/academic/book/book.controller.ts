import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
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
}
