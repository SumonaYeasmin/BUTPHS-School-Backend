import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class QueryExamSubjectDto {
  @ApiPropertyOptional({
    description: 'Filter subjects by Academic Group UUID (e.g. Science, Commerce)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Filter by optional/4th subject status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isOptional?: boolean;
}
