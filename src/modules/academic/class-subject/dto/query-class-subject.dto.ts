import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryClassSubjectDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Filter class subjects by Academic Year UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'academicYearId must be a valid UUID' })
  academicYearId?: string;

  @ApiPropertyOptional({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Filter class subjects by School Class UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId?: string;

  @ApiPropertyOptional({
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    description:
      'Filter class subjects by Academic Group UUID (Science/Commerce/Humanities)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'groupId must be a valid UUID' })
  groupId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter by optional (true) or mandatory (false) subjects',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isOptional must be a boolean' })
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: 'Physics',
    description: 'Search term to match subject name or code',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

