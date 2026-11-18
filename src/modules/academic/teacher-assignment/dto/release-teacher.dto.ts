import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReleaseTeacherDto {
  @ApiPropertyOptional({
    description: 'Release / departure date (YYYY-MM-DD), defaults to today',
    example: '2026-05-01',
  })
  @IsDateString()
  @IsOptional()
  releasedDate?: string;
}
