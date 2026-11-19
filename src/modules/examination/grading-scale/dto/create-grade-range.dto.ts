import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGradeRangeDto {
  @ApiProperty({
    example: 80.0,
    description: 'Minimum marks percentage for this grade (0.00 - 100.00)',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minPercentage: number;

  @ApiProperty({
    example: 100.0,
    description: 'Maximum marks percentage for this grade (0.00 - 100.00)',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxPercentage: number;

  @ApiProperty({
    example: 'A+',
    description: 'Letter grade code (e.g. A+, A, A-, B, C, D, F)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  letterGrade: string;

  @ApiProperty({
    example: 5.0,
    description: 'Grade point value (e.g. 5.00, 4.00, 0.00)',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  gradePoint: number;

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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFailGrade?: boolean = false;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for mark sheets and report cards',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;
}
