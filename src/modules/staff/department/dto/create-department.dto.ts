import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DepartmentStatus } from '../../../../../prisma/generated/client';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'বিজ্ঞান বিভাগ',
    description: 'Unique name of the department (e.g., বিজ্ঞান বিভাগ, Accounts, Office Management)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'SCI',
    description: 'Unique short code for the department (e.g., SCI, ACC, ADM)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({
    example: 'পদার্থ, রসায়ন, জীববিজ্ঞান ও গণিত বিষয়ের শিক্ষক ও গবেষণাগার',
    description: 'Detailed description of the department',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for UI / website presentation (ascending order)',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    enum: DepartmentStatus,
    example: DepartmentStatus.ACTIVE,
    description: 'Status of the department (ACTIVE, INACTIVE)',
    default: DepartmentStatus.ACTIVE,
  })
  @IsEnum(DepartmentStatus)
  @IsOptional()
  status?: DepartmentStatus = DepartmentStatus.ACTIVE;
}
