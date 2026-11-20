import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'MARKS_ENTRY',
    description:
      'Unique permission identifier in UPPER_SNAKE_CASE (e.g. EXAM_CREATE, MARKS_ENTRY, FEES_COLLECT)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Allows teachers and staff to input and submit student exam marks',
    description: 'Human-readable description of what this permission allows',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
