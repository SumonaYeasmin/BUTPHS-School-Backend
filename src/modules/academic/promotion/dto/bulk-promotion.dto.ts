import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class StudentGroupOverrideDto {
  @ApiProperty({
    description: 'Student UUID to override group/optional subject for Class 9/10',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  @IsNotEmpty({ message: 'studentId is required' })
  studentId: string;

  @ApiProperty({
    description: 'Academic Group UUID (e.g. Science, Commerce, Humanities)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'groupId must be a valid UUID' })
  @IsNotEmpty({ message: 'groupId is required' })
  groupId: string;

  @ApiPropertyOptional({
    description: 'Optional 4th ClassSubject UUID',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'optionalClassSubjectId must be a valid UUID' })
  @IsOptional()
  optionalClassSubjectId?: string;

  @ApiPropertyOptional({
    description: 'Alias for optionalClassSubjectId (backward compatibility)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'optionalSubjectId must be a valid UUID' })
  @IsOptional()
  optionalSubjectId?: string;
}

export class BulkPromotionDto {
  @ApiProperty({
    description: 'Source Academic Year UUID (where students currently study)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'sourceAcademicYearId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceAcademicYearId is required' })
  sourceAcademicYearId: string;

  @ApiProperty({
    description: 'Source Class UUID to promote from',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'sourceClassId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceClassId is required' })
  sourceClassId: string;

  @ApiProperty({
    description: 'Source Section UUID (e.g. Section A)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'sourceSectionId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceSectionId is required' })
  sourceSectionId: string;

  @ApiPropertyOptional({
    description:
      'Target Academic Year UUID (Required for Class 6-9 promotion; omit for Class 10 Graduation)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsUUID('4', { message: 'targetAcademicYearId must be a valid UUID' })
  @IsOptional()
  targetAcademicYearId?: string;

  @ApiPropertyOptional({
    description:
      'Target Class UUID (Required for Class 6-9 promotion; omit for Class 10 Graduation)',
    example: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  @IsUUID('4', { message: 'targetClassId must be a valid UUID' })
  @IsOptional()
  targetClassId?: string;

  @ApiPropertyOptional({
    description:
      'Target Section UUID (Required for Class 6-9 promotion; omit for Class 10 Graduation)',
    example: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  })
  @IsUUID('4', { message: 'targetSectionId must be a valid UUID' })
  @IsOptional()
  targetSectionId?: string;

  @ApiPropertyOptional({
    description:
      'Final Exam UUID (optional; if omitted, automatically uses the published CONSOLIDATED or ANNUAL exam for this class & year)',
    example: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
  })
  @IsUUID('4', { message: 'examId must be a valid UUID' })
  @IsOptional()
  examId?: string;

  @ApiPropertyOptional({
    description:
      'Default Academic Group UUID for target class (if promoting into Class 9 or 10)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88',
  })
  @IsUUID('4', { message: 'defaultGroupId must be a valid UUID' })
  @IsOptional()
  defaultGroupId?: string;

  @ApiPropertyOptional({
    description:
      'Per-student group and optional subject assignments when promoting to Class 9/10',
    type: [StudentGroupOverrideDto],
  })
  @IsArray({ message: 'groupOverrides must be an array' })
  @ValidateNested({ each: true })
  @Type(() => StudentGroupOverrideDto)
  @IsOptional()
  groupOverrides?: StudentGroupOverrideDto[];

  @ApiPropertyOptional({
    description: 'Promotion effective date (defaults to current date)',
    example: '2025-01-01',
  })
  @IsDateString({}, { message: 'promotionDate must be a valid ISO date string' })
  @IsOptional()
  promotionDate?: string;

  @ApiPropertyOptional({
    description: 'General remarks for this promotion batch',
    example: 'Annual Exam 2024 automated bulk promotion',
  })
  @IsString({ message: 'remarks must be a string' })
  @MaxLength(255, { message: 'remarks cannot exceed 255 characters' })
  @IsOptional()
  remarks?: string;
}
