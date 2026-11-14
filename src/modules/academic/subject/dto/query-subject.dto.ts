import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QuerySubjectDto {
  @ApiPropertyOptional({
    description: 'Search subjects by name or board code',
    example: 'Bangla',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
