import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class GraduateBatchDto {
  @ApiProperty({
    description: 'Academic Year UUID of the graduating batch',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'academicYearId must be a valid UUID' })
  @IsNotEmpty({ message: 'academicYearId is required' })
  academicYearId: string;

  @ApiProperty({
    description: 'Terminal Class UUID (Class 10)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsNotEmpty({ message: 'classId is required' })
  classId: string;

  @ApiPropertyOptional({
    description:
      'Section UUID (optional; if omitted, graduates all Class 10 sections)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Graduation/Completion date (defaults to current date)',
    example: '2024-12-31',
  })
  @IsDateString({}, { message: 'completionDate must be a valid ISO date string' })
  @IsOptional()
  completionDate?: string;

  @ApiPropertyOptional({
    description: 'Remarks or certificate note for the graduating batch',
    example: 'SSC Batch 2024 successfully completed high school curriculum',
  })
  @IsString({ message: 'remarks must be a string' })
  @MaxLength(255, { message: 'remarks cannot exceed 255 characters' })
  @IsOptional()
  remarks?: string;
}
