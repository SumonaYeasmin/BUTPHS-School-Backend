import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'MARKS_ENTRY',
    description:
      'Unique permission identifier string in UPPER_SNAKE_CASE (e.g. EXAM_CREATE, MARKS_ENTRY, FEES_COLLECT)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Grants access to enter and submit student examination marks',
    description: 'Human-readable description of what this permission enables',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
