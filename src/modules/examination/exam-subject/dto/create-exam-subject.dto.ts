import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateExamSubjectDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Subject UUID from curriculum',
  })
  @IsUUID('4')
  @IsNotEmpty()
  subjectId: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description:
      'Academic Group UUID (e.g. Science, Humanities, Business Studies). Null for general subjects.',
  })
  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @ApiProperty({
    example: 100.0,
    description: 'Total full marks for this subject in the examination',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  fullMarks: number;

  @ApiProperty({
    example: 33.0,
    description: 'Minimum aggregate marks required to pass this subject',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  passMarks: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this subject includes a written (Creative/CQ) test component',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  hasWritten?: boolean = true;

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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasMcq?: boolean = false;

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
    description: 'Whether this subject includes a Practical (Lab) test component',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPractical?: boolean = false;

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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasContinuousAssessment?: boolean = false;

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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean = false;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Display sequence order in mark sheets, grade cards, and routines',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
