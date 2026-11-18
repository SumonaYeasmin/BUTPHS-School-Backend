import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiPropertyOptional({
    example: '2026-11-30',
    description:
      'Leaving date / Date of resignation or retirement (YYYY-MM-DD). If status is changed to RETIRED/RESIGNED/TERMINATED, this records when they left.',
  })
  @IsDateString()
  @IsOptional()
  leavingDate?: string;
}
