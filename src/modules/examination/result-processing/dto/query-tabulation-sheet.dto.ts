import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ResultStatus } from '../../../../../prisma/generated/client';

export class QueryTabulationSheetDto {
  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Filter tabulation sheet by specific section UUID',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @ApiPropertyOptional({
    enum: ResultStatus,
    description: 'Filter by result status (PASS, FAIL, INCOMPLETE)',
  })
  @IsOptional()
  @IsEnum(ResultStatus)
  resultStatus?: ResultStatus;

  @ApiPropertyOptional({
    example: 'Rahim',
    description: 'Search by student name or roll number',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
