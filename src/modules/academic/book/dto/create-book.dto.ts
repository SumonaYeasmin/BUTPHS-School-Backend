import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { BookType } from '../../../../../prisma/generated/client';

export class CreateBookDto {
  @ApiProperty({
    example: 'e4c08395-e224-4b2c-8f9d-9f5388c17932',
    description: 'School Class UUID for which the book is prescribed',
  })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    example: 'f5d19406-f335-4c3d-90ae-0f6499d28043',
    description: 'Master Subject UUID to which the book belongs',
  })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({
    example: 'চারুপাঠ',
    description: 'Name / Title of the textbook or supplementary book',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'NCTB-B1-06',
    description: 'Optional book code or barcode',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bookCode?: string;

  @ApiPropertyOptional({
    enum: BookType,
    default: BookType.TEXTBOOK,
    description: 'Book type: TEXTBOOK, SUPPLEMENTARY, GRAMMAR, REFERENCE',
  })
  @IsOptional()
  @IsEnum(BookType)
  type?: BookType;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: 'Display order when listing books under this subject',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
