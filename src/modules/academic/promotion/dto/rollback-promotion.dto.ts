import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RollbackBatchDto {
  @ApiProperty({
    description: 'Source Academic Year UUID (where students were promoted from)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'sourceAcademicYearId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceAcademicYearId is required' })
  sourceAcademicYearId: string;

  @ApiProperty({
    description: 'Source Class UUID (e.g. Class 6)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'sourceClassId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceClassId is required' })
  sourceClassId: string;

  @ApiProperty({
    description: 'Source Section UUID (e.g. Section A)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'sourceSectionId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceSectionId is required' })
  sourceSectionId: string;

  @ApiProperty({
    description:
      'Target Academic Year UUID (where students were mistakenly promoted to)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsUUID('4', { message: 'targetAcademicYearId must be a valid UUID' })
  @IsNotEmpty({ message: 'targetAcademicYearId is required' })
  targetAcademicYearId: string;

  @ApiPropertyOptional({
    description:
      'Optional list of specific promotion UUIDs to rollback; if omitted, rollbacks the entire batch',
    type: [String],
    example: ['e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'],
  })
  @IsArray({ message: 'promotionIds must be an array of UUIDs' })
  @IsUUID('4', { each: true, message: 'Each promotionId must be a valid UUID' })
  @IsOptional()
  promotionIds?: string[];

  @ApiPropertyOptional({
    description: 'Reason for performing the rollback',
    example: 'Annual examination results revised after re-check',
  })
  @IsString({ message: 'reason must be a string' })
  @MaxLength(255, { message: 'reason cannot exceed 255 characters' })
  @IsOptional()
  reason?: string;
}
