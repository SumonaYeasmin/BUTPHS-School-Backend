import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AssignTeacherDto {
  @ApiProperty({
    description: 'UUID of the Teacher (Staff member)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({
    description: 'UUID of the Academic Year',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({
    description: 'UUID of the School Class',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    description: 'UUID of the Section',
    example: '44444444-4444-4444-4444-444444444444',
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({
    description: 'UUID of the Class Subject',
    example: '55555555-5555-5555-5555-555555555555',
  })
  @IsUUID()
  @IsNotEmpty()
  classSubjectId: string;

  @ApiPropertyOptional({
    description: 'Assignment start date (YYYY-MM-DD), defaults to today',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  assignedDate?: string;

  @ApiPropertyOptional({
    description: 'Whether the teacher is authorized to enter marks in portal',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  canEnterMarks?: boolean = true;

  @ApiPropertyOptional({
    description:
      'If an active teacher is already assigned to this subject, setting this to true will automatically release the old teacher and assign the new one.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  replaceExisting?: boolean = false;
}
