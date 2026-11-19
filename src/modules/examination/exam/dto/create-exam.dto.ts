import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExamStatus, ExamType } from '../../../../../prisma/generated/client';

export class CreateExamDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Academic Year UUID',
  })
  @IsUUID('4')
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'School Class UUID (e.g. Class 10)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({
    example: '33333333-3333-3333-3333-333333333333',
    description:
      'Grading Scale UUID. If not provided, the active default/system grading scale will be automatically assigned.',
  })
  @IsOptional()
  @IsUUID('4')
  gradingScaleId?: string;

  @ApiProperty({
    example: 'Half Yearly Examination 2026',
    description: 'Descriptive title of the examination',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    enum: ExamType,
    example: ExamType.HALF_YEARLY,
    description: 'Type of examination (HALF_YEARLY, ANNUAL, MODEL_TEST, SELECTION)',
  })
  @IsEnum(ExamType)
  @IsNotEmpty()
  examType: ExamType;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Exam commencement date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Exam conclusion date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    enum: ExamStatus,
    example: ExamStatus.UPCOMING,
    description:
      'Current status of the examination (UPCOMING, ONGOING, COMPLETED, CANCELLED). If omitted, inferred automatically based on current date.',
  })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @ApiPropertyOptional({
    example: '2026-07-10T23:59:59.000Z',
    description:
      'Final deadline for subject teachers to enter and submit marks',
  })
  @IsOptional()
  @IsDateString()
  marksEntryDeadline?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether combined passing policy applies across 1st and 2nd papers (e.g. Bangla 1st + 2nd, English 1st + 2nd)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowCombinedPass?: boolean = true;

  @ApiPropertyOptional({
    example: 40.0,
    description:
      'Weightage percentage contribution to the final consolidated annual result (0.00 - 100.00)',
    default: null,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weightagePercentage?: number;
}
