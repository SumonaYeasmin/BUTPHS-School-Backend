import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateGradeRangeDto } from './create-grade-range.dto';

export class CreateGradingScaleDto {
  @ApiProperty({
    example: 'NCTB Secondary GPA 5.0 Scale',
    description: 'Unique name of the grading scale',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Standard national curriculum grading scale for Classes 6-10 with GPA 5.00 max',
    description: 'Detailed description or notes about this grading policy',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'Maximum achievable GPA on this scale (default 5.00)',
    default: 5.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxGpa?: number = 5.0;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is the default grading scale for new exams',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this grading scale is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    type: [CreateGradeRangeDto],
    description: 'Optional list of grade ranges to configure atomically with the scale',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeRangeDto)
  gradeRanges?: CreateGradeRangeDto[];
}
