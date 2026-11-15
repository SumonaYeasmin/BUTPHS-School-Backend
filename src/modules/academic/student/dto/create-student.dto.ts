import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender } from '../../../../../prisma/generated/client';

export class CreateStudentDto {
  // --- Personal Info ---
  @ApiPropertyOptional({
    example: 'STU20260001',
    description: 'Unique Student ID (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentId?: string;

  @ApiProperty({
    example: 'Md. Rahat Hossain',
    description: 'Full name of the student',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'Gender of the student (MALE, FEMALE, OTHER)',
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiPropertyOptional({
    example: '2010-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'O+',
    description: 'Blood group (A+, B+, O+, AB+, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @ApiPropertyOptional({
    example: 'Islam',
    description: 'Religion of the student',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({
    example: '19901234567890123',
    description: 'Birth certificate number (must be unique if provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateNo?: string;

  @ApiPropertyOptional({
    example: 'RFID-987654321',
    description: 'RFID attendance card number (must be unique if provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rfidCardNo?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/photos/student-1.jpg',
    description: 'Photo URL of the student',
  })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({
    example: 'House 12, Road 4, Mirpur-10, Dhaka',
    description: 'Present address',
  })
  @IsOptional()
  @IsString()
  presentAddress?: string;

  @ApiPropertyOptional({
    example: 'Village: Rupganj, Upazila: Rupganj, Narayanganj',
    description: 'Permanent address',
  })
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Admission date (defaults to current date if omitted)',
  })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  // --- Initial Enrollment Info ---
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Academic Year UUID (defaults to current active year if omitted)',
  })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Class UUID where the student will be enrolled',
  })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Section UUID under the class',
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    description:
      'Academic Group UUID (Science, Arts, Commerce - optional for high school classes)',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty({
    example: 1,
    description: 'Roll number in the class and section',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  roll: number;
}
