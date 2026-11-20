import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { BookType } from '../../../../../prisma/generated/client';

export class QueryBookDto {
  @ApiPropertyOptional({ description: 'Filter by School Class UUID' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by Master Subject UUID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({
    enum: BookType,
    description: 'Filter by Book Type (TEXTBOOK, SUPPLEMENTARY, GRAMMAR, REFERENCE)',
  })
  @IsOptional()
  @IsEnum(BookType)
  type?: BookType;

  @ApiPropertyOptional({
    description: 'Search books by name or book code (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status (true/false)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
