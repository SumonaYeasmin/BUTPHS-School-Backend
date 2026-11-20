import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ExamRoutineStatus } from '../../../../../prisma/generated/client';

export class CreateExamRoutineDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Exam Subject Config UUID (from this exam)',
  })
  @IsUUID('4')
  @IsNotEmpty()
  examSubjectId: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description:
      'Section UUID if this routine/room applies to a specific section. Omit or null for all sections.',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Date of the examination (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  examDate: string;

  @ApiProperty({
    example: '10:00',
    description: 'Exam start time (HH:mm or HH:mm:ss in 24-hour format)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'startTime must be a valid 24-hour time format (e.g. 10:00 or 10:00:00)',
  })
  startTime: string;

  @ApiProperty({
    example: '13:00',
    description: 'Exam conclusion time (HH:mm or HH:mm:ss in 24-hour format)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'endTime must be a valid 24-hour time format (e.g. 13:00 or 13:00:00)',
  })
  endTime: string;

  @ApiPropertyOptional({
    example: 'Room 102',
    description: 'Assigned examination hall or room number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomNo?: string;

  @ApiPropertyOptional({
    enum: ExamRoutineStatus,
    example: ExamRoutineStatus.SCHEDULED,
    description: 'Initial routine slot status (default SCHEDULED)',
    default: ExamRoutineStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(ExamRoutineStatus)
  status?: ExamRoutineStatus = ExamRoutineStatus.SCHEDULED;

  @ApiPropertyOptional({
    example: 'Scientific calculators allowed. Mobile phones strictly prohibited.',
    description: 'Special rules and instructions for this exam slot',
  })
  @IsOptional()
  @IsString()
  instructions?: string;
}
