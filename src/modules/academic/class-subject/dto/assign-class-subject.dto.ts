import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class AssignClassSubjectDto {
  @ApiProperty({
    example: 'd3b07384-d113-4a1b-9e8c-8f4277b06821',
    description: 'Academic Year UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({
    example: 'e4c08395-e224-4b2c-8f9d-9f5388c17932',
    description: 'School Class UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    example: 'f5d19406-f335-4c3d-90ae-0f6499d28043',
    description: 'Master Subject UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-4a1b-9c2d-3e4f5a6b7c8d',
    description: 'Academic Group UUID (e.g. Science, Commerce for Class 9-10)',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether this subject is optional (e.g., 4th subject)',
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: 'Display order on marksheets and routines',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
