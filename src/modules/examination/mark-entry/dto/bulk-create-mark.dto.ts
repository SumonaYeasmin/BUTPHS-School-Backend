import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class StudentMarkEntryItemDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Student Enrollment UUID',
  })
  @IsUUID('4')
  @IsNotEmpty()
  studentEnrollmentId: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the student was absent for this examination',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean = false;

  @ApiPropertyOptional({
    example: 62.5,
    description: 'Marks obtained in the Written (Creative/CQ) test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  writtenMarks?: number = 0;

  @ApiPropertyOptional({
    example: 24.0,
    description: 'Marks obtained in the MCQ test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mcqMarks?: number = 0;

  @ApiPropertyOptional({
    example: 22.0,
    description: 'Marks obtained in the Practical (Lab) test component',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  practicalMarks?: number = 0;

  @ApiPropertyOptional({
    example: 18.0,
    description: 'Marks obtained in Continuous Assessment',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  continuousAssessmentMarks?: number = 0;
}

export class BulkCreateMarkDto {
  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Exam Subject Config UUID for this batch',
  })
  @IsUUID('4')
  @IsNotEmpty()
  examSubjectId: string;

  @ApiPropertyOptional({
    example: '33333333-3333-3333-3333-333333333333',
    description:
      'Optional Section UUID filter to verify all students in this batch belong to this section',
  })
  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @ApiProperty({
    type: [StudentMarkEntryItemDto],
    description: 'List of student marks to enter or update',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentMarkEntryItemDto)
  marks: StudentMarkEntryItemDto[];
}
