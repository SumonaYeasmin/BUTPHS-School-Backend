import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class PreviewPromotionDto {
  @ApiProperty({
    description: 'Source Academic Year UUID (where students currently study)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'academicYearId must be a valid UUID' })
  @IsNotEmpty({ message: 'academicYearId is required' })
  academicYearId: string;

  @ApiProperty({
    description: 'Source Class UUID to promote from',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsNotEmpty({ message: 'classId is required' })
  classId: string;

  @ApiPropertyOptional({
    description:
      'Source Section UUID (optional; if omitted, previews all sections in the class)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({
    description:
      'Final Exam UUID (optional; if omitted, automatically finds the published ANNUAL exam for this class & year)',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsUUID('4', { message: 'examId must be a valid UUID' })
  @IsOptional()
  examId?: string;
}
