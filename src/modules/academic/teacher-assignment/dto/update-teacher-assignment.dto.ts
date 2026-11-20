import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateTeacherAssignmentDto {
  @ApiPropertyOptional({
    description: 'UUID of a new Teacher to transfer this assignment to',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Whether the teacher is authorized to enter marks in portal',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  canEnterMarks?: boolean;

  @ApiPropertyOptional({
    description: 'Assignment start date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  assignedDate?: string;

  @ApiPropertyOptional({
    description: 'Release / departure date (YYYY-MM-DD)',
    example: '2026-06-30',
  })
  @IsDateString()
  @IsOptional()
  releasedDate?: string;

  @ApiPropertyOptional({
    description:
      'Active status of this assignment. Setting to false will mark the teacher as released.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
