import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../../../../prisma/generated/client';
import { AssignParentDto } from './assign-parent.dto';

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

  @ApiPropertyOptional({
    example: 'Md. Rahat Hossain',
    description: 'English full name of the student (for admit card, certificate, and board registration)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameEn?: string;

  @ApiPropertyOptional({
    example: 'মোঃ রাহাত হোসেন',
    description: 'Bengali full name of the student (for local certificates and reports)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameBn?: string;

  @ApiPropertyOptional({
    example: 'Md. Rahat Hossain',
    description: 'Full name of the student (legacy alias; mapped to nameEn if nameEn is omitted)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

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

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440004',
    description: 'Optional 4th Subject UUID (for Class 9 and 10)',
  })
  @IsOptional()
  @IsUUID()
  optionalSubjectId?: string;

  @ApiProperty({
    example: 1,
    description: 'Roll number in the class and section',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  roll: number;

  // --- Optional Parents/Guardians linked or created during admission ---
  @ApiPropertyOptional({
    type: [AssignParentDto],
    description:
      'Optional list of parents/guardians to create or link to this student during admission (Atomic Transaction)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignParentDto)
  parents?: AssignParentDto[];
}
