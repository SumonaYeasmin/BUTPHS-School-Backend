import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGradeRangeDto {
  @ApiPropertyOptional({
    example: 80.0,
    description: 'Minimum marks percentage for this grade (0.00 - 100.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minPercentage?: number;

  @ApiPropertyOptional({
    example: 100.0,
    description: 'Maximum marks percentage for this grade (0.00 - 100.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxPercentage?: number;

  @ApiPropertyOptional({
    example: 'A+',
    description: 'Letter grade code (e.g. A+, A, A-, B, C, D, F)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  letterGrade?: string;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Grade point value (e.g. 5.00, 4.00, 0.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  gradePoint?: number;

  @ApiPropertyOptional({
    example: 'Outstanding',
    description: 'Assessment remarks (e.g. Outstanding, Excellent, Fail)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  remarks?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this grade tier signifies an academic fail (e.g. F grade)',
  })
  @IsOptional()
  @IsBoolean()
  isFailGrade?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for mark sheets and report cards',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
