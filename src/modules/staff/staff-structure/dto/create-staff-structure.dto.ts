import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StaffType } from '../../../../../prisma/generated/client';

export class CreateStaffStructureDto {
  @ApiProperty({
    example: 'সহকারী শিক্ষক (গণিত)',
    description: 'Designation / Approved post title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  designation: string;

  @ApiProperty({
    enum: StaffType,
    example: StaffType.TEACHER,
    description: 'Category of staff (TEACHER, OFFICER, EMPLOYEE)',
  })
  @IsEnum(StaffType)
  @IsNotEmpty()
  staffType: StaffType;

  @ApiProperty({
    example: 3,
    description: 'Total number of approved positions (Sanctioned quota)',
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  totalPositions: number;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'UUID of the department this post belongs to',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this approved post is currently active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
