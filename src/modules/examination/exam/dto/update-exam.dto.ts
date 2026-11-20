import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExamStatus, ExamType } from '../../../../../prisma/generated/client';

export class UpdateExamDto {
  @ApiPropertyOptional({
    example: 'Half Yearly Examination 2026 (Revised)',
    description: 'Updated descriptive title of the examination',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    enum: ExamType,
    example: ExamType.HALF_YEARLY,
    description: 'Type of examination',
  })
  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @ApiPropertyOptional({
    example: '33333333-3333-3333-3333-333333333333',
    description: 'Grading Scale UUID to use for this exam',
  })
  @IsOptional()
  @IsUUID('4')
  gradingScaleId?: string;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Exam start date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Exam conclusion date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ExamStatus,
    example: ExamStatus.ONGOING,
    description: 'Current status of the examination',
  })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @ApiPropertyOptional({
    example: '2026-07-10T23:59:59.000Z',
    description: 'Final deadline for teachers to submit subject marks',
  })
  @IsOptional()
  @IsDateString()
  marksEntryDeadline?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether combined passing policy applies across 1st and 2nd papers (e.g. Bangla 1st + 2nd)',
  })
  @IsOptional()
  @IsBoolean()
  allowCombinedPass?: boolean;

  @ApiPropertyOptional({
    example: 40.0,
    description:
      'Weightage percentage contribution to the final consolidated annual result (0.00 - 100.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weightagePercentage?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Lock or unlock the examination. When locked, marks and grades cannot be modified.',
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
