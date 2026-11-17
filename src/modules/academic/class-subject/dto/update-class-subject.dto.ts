import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateClassSubjectDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-4a1b-9c2d-3e4f5a6b7c8d',
    description: 'Academic Group UUID (or null to remove group)',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this subject is optional (e.g., 4th subject)',
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: 2,
    description: 'Display order on marksheets and routines',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
