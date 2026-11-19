import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class QueryGradeSheetDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Exam Subject Config UUID to retrieve grade sheet for',
  })
  @IsUUID('4')
  @IsNotEmpty()
  examSubjectId: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description:
      'Section UUID filter. If omitted, returns all students across sections eligible for this exam subject.',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;
}
