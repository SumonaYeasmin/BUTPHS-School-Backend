import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryPromotionDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term for student name or student ID',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by Source Academic Year UUID (where promoted from)',
  })
  @IsOptional()
  @IsUUID('4')
  sourceAcademicYearId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Target Academic Year UUID (where promoted to)',
  })
  @IsOptional()
  @IsUUID('4')
  targetAcademicYearId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Source Class UUID',
  })
  @IsOptional()
  @IsUUID('4')
  sourceClassId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Target Class UUID',
  })
  @IsOptional()
  @IsUUID('4')
  targetClassId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Section UUID (in source or target class)',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;
}
