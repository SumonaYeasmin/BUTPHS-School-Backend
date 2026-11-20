import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateExamSubjectDto {
  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description:
      'Academic Group UUID (e.g. Science, Humanities, Business Studies). Null for general subjects.',
  })
  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @ApiPropertyOptional({
    example: 100.0,
    description: 'Total full marks for this subject in the examination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  fullMarks?: number;

  @ApiPropertyOptional({
    example: 33.0,
    description: 'Minimum aggregate marks required to pass this subject',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  passMarks?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether this subject includes a written (Creative/CQ) test component',
  })
  @IsOptional()
  @IsBoolean()
  hasWritten?: boolean;

  @ApiPropertyOptional({
    example: 70.0,
    description: 'Full marks allocated for the written test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  writtenFullMarks?: number;

  @ApiPropertyOptional({
    example: 23.0,
    description: 'Minimum marks required to pass the written test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  writtenPassMarks?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this subject includes an MCQ test component',
  })
  @IsOptional()
  @IsBoolean()
  hasMcq?: boolean;

  @ApiPropertyOptional({
    example: 30.0,
    description: 'Full marks allocated for the MCQ test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mcqFullMarks?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Minimum marks required to pass the MCQ test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mcqPassMarks?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether this subject includes a Practical (Lab) test component',
  })
  @IsOptional()
  @IsBoolean()
  hasPractical?: boolean;

  @ApiPropertyOptional({
    example: 25.0,
    description: 'Full marks allocated for the Practical test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  practicalFullMarks?: number;

  @ApiPropertyOptional({
    example: 8.0,
    description: 'Minimum marks required to pass the Practical test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  practicalPassMarks?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether this subject includes Continuous Assessment (SBA / Class Performance)',
  })
  @IsOptional()
  @IsBoolean()
  hasContinuousAssessment?: boolean;

  @ApiPropertyOptional({
    example: 20.0,
    description: 'Full marks allocated for Continuous Assessment',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  continuousAssessmentFullMarks?: number;

  @ApiPropertyOptional({
    example: 7.0,
    description: 'Minimum pass marks for Continuous Assessment',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  continuousAssessmentPassMarks?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this subject can be taken as an optional/4th subject',
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Display sequence order in mark sheets, grade cards, and routines',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
