import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QuerySubjectDto {
  @ApiPropertyOptional({
    description: 'Search subjects by name or board code',
    example: 'Bangla',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter subjects assigned to a specific class UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description:
      'Filter subjects by target class or grade (e.g. Class 6, Class 9-10)',
    example: 'Class 6',
  })
  @IsOptional()
  @IsString()
  targetClass?: string;
}
