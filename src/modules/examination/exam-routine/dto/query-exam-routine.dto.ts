import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ExamRoutineStatus } from '../../../../../prisma/generated/client';

export class QueryExamRoutineDto {
  @ApiPropertyOptional({
    description: 'Filter routines by Exam UUID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID('4')
  examId?: string;

  @ApiPropertyOptional({
    description: 'Filter routines by Academic Year UUID (e.g. 2026)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID('4')
  academicYearId?: string;

  @ApiPropertyOptional({
    description: 'Filter routines by School Class UUID (e.g. Class 10)',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter routines by Section UUID',
    example: '44444444-4444-4444-4444-444444444444',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @ApiPropertyOptional({
    enum: ExamRoutineStatus,
    description: 'Filter by routine slot status (SCHEDULED, POSTPONED, CANCELLED, COMPLETED)',
    example: ExamRoutineStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(ExamRoutineStatus)
  status?: ExamRoutineStatus;

  @ApiPropertyOptional({
    description: 'Filter routines from this date onwards (YYYY-MM-DD)',
    example: '2026-06-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter routines up to this date (YYYY-MM-DD)',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
