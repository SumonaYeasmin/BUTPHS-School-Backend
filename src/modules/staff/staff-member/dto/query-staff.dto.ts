import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import {
  EmploymentType,
  Gender,
  StaffStatus,
  StaffType,
} from '../../../../../prisma/generated/client';

export class QueryStaffDto {
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
    description: 'Search by staff name, employee ID, phone, email, or NID',
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
    description: 'Filter by Staff Structure (Approved Post) UUID',
  })
  @IsOptional()
  @IsUUID()
  staffStructureId?: string;

  @ApiPropertyOptional({
    enum: StaffStatus,
    description: 'Filter by status (ACTIVE, RESIGNED, RETIRED, TERMINATED)',
  })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @ApiPropertyOptional({
    enum: EmploymentType,
    description: 'Filter by employment type (PERMANENT, PROBATIONARY, CONTRACTUAL, PART_TIME)',
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Filter by gender',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
