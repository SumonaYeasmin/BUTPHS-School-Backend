import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @ApiPropertyOptional({
    example: 'MARKS_ENTRY_EXTENDED',
    description: 'Updated unique permission identifier in UPPER_SNAKE_CASE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description of what this permission enables',
    description: 'Updated description of the permission',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
