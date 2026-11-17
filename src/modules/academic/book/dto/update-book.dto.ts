import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BookType } from '../../../../../prisma/generated/client';

export class UpdateBookDto {
  @ApiPropertyOptional({
    example: 'চারুপাঠ (সংশোধিত)',
    description: 'Updated title / name of the book',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'NCTB-B1-06-REV',
    description: 'Updated book code or barcode (or empty/null)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bookCode?: string;

  @ApiPropertyOptional({
    enum: BookType,
    description: 'Book type: TEXTBOOK, SUPPLEMENTARY, GRAMMAR, REFERENCE',
  })
  @IsOptional()
  @IsEnum(BookType)
  type?: BookType;

  @ApiPropertyOptional({
    example: 2,
    description: 'Display order when listing books under this subject',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status of the book (true = active, false = archived)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
