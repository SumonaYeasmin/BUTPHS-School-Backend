import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class IssueTcDto {
  @ApiProperty({
    description: 'UUID of the student leaving the institution',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'Date of leaving the school (YYYY-MM-DD)',
    example: '2026-11-18',
  })
  @IsDateString()
  @IsNotEmpty()
  leavingDate: string;

  @ApiProperty({
    description: 'Reason for transfer / leaving the school',
    example: 'অভিভাবকের অভিপ্রায় / বাসস্থান পরিবর্তন',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether all dues are cleared up to date',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  duesCleared?: boolean = true;

  @ApiPropertyOptional({
    description: 'Conduct and character remarks',
    example: 'উত্তম ও সন্তোষজনক',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  conductRemarks?: string;

  @ApiPropertyOptional({
    description: 'Whether student was promoted to the next class before leaving',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  promotedToNextClass?: boolean = false;

  @ApiPropertyOptional({
    description: 'Name of the destination school/institution',
    example: 'কুমিল্লা জিলা স্কুল',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destinationSchool?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or remarks',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Scanned document or PDF URL',
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
