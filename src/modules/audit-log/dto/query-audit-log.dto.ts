import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by action, module, or user name/email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'EXAMINATION',
    description: 'Filter by module (e.g. EXAMINATION, AUTH, ACADEMIC, STAFF)',
  })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({
    example: 'UPDATE_MARK',
    description: 'Filter by specific action (e.g. UPDATE_MARK, USER_LOGIN, DELETE_STUDENT)',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by User UUID who performed the action',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Start date filter (inclusive) in YYYY-MM-DD or ISO string format',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'End date filter (inclusive) in YYYY-MM-DD or ISO string format',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
