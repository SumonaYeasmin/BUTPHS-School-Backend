import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { StaffType } from '../../../../../prisma/generated/client';

export class QueryStaffStructureDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by designation title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: StaffType,
    description: 'Filter by staff type (TEACHER, OFFICER, EMPLOYEE)',
  })
  @IsOptional()
  @IsEnum(StaffType)
  staffType?: StaffType;

  @ApiPropertyOptional({
    description: 'Filter by Department UUID',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter only posts that have vacancies (শূন্যপদ আছে এমন পদ)',
  })
  @IsOptional()
  @Type(() => Boolean)
  hasVacancy?: boolean;
}
