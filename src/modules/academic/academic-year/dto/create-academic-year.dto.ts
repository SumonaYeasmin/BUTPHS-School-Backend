import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    example: '2026',
    description: 'Academic year name (e.g., 2026 or 2026-2027)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Start date of the academic year (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'End date of the academic year (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set as the current active academic year',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

