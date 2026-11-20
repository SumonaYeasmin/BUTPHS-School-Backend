import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateGradeRangeDto } from './create-grade-range.dto';

export class UpdateGradingScaleDto {
  @ApiPropertyOptional({
    example: 'NCTB Secondary GPA 5.0 Scale (Updated)',
    description: 'Unique name of the grading scale',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description of the grading policy',
    description: 'Detailed description or notes about this grading policy',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Maximum achievable GPA on this scale (min 1.0)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxGpa?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this is the default grading scale for new exams',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this grading scale is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateGradeRangeDto],
    description:
      'Optional list of grade ranges to completely replace/sync atomically with the scale',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeRangeDto)
  gradeRanges?: CreateGradeRangeDto[];
}
