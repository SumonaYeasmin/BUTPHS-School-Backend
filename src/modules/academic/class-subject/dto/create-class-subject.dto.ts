import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateClassSubjectDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description:
      'Academic year UUID. If omitted, the currently active academic year is used automatically.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'academicYearId must be a valid UUID' })
  academicYearId?: string;

  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'School class UUID (e.g. Class 6, Class 9)',
  })
  @IsNotEmpty({ message: 'classId is required' })
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId: string;

  @ApiProperty({
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    description: 'Subject UUID from master subject catalog',
  })
  @IsNotEmpty({ message: 'subjectId is required' })
  @IsUUID('4', { message: 'subjectId must be a valid UUID' })
  subjectId: string;

  @ApiPropertyOptional({
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    description:
      'Academic group UUID (e.g. Science, Commerce, Humanities). Null/omitted for general subjects common to all groups.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'groupId must be a valid UUID' })
  groupId?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Indicates whether this subject is optional (e.g. 4th subject) or mandatory in the class curriculum.',
  })
  @IsOptional()
  @IsBoolean({ message: 'isOptional must be a boolean' })
  isOptional?: boolean;
}

