import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateMarkDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Student Enrollment UUID',
  })
  @IsUUID('4')
  @IsNotEmpty()
  studentEnrollmentId: string;

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Exam Subject Config UUID',
  })
  @IsUUID('4')
  @IsNotEmpty()
  examSubjectId: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether the student was absent in this examination. If true, all marks are automatically recorded as 0.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean = false;

  @ApiPropertyOptional({
    example: 62.5,
    description: 'Marks obtained in the Written (Creative/CQ) test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  writtenMarks?: number = 0;

  @ApiPropertyOptional({
    example: 24.0,
    description: 'Marks obtained in the MCQ test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mcqMarks?: number = 0;

  @ApiPropertyOptional({
    example: 22.0,
    description: 'Marks obtained in the Practical (Lab) test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  practicalMarks?: number = 0;

  @ApiPropertyOptional({
    example: 18.0,
    description: 'Marks obtained in Continuous Assessment (SBA)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  continuousAssessmentMarks?: number = 0;
}
