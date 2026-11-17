import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender, StudentStatus } from '../../../../../prisma/generated/client';

export class UpdateStudentDto {
  // --- Personal Info ---
  @ApiPropertyOptional({
    example: 'Md. Rahat Hossain',
    description: 'Full name of the student',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    enum: Gender,
    example: Gender.MALE,
    description: 'Gender of the student',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: '2010-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'O+',
    description: 'Blood group',
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
    description: 'Birth certificate number (must be unique if changed)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateNo?: string;

  @ApiPropertyOptional({
    example: 'RFID-987654321',
    description: 'RFID attendance card number (must be unique if changed)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rfidCardNo?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/photos/student-updated.jpg',
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
    enum: StudentStatus,
    example: StudentStatus.ACTIVE,
    description:
      'Student overall status (ACTIVE, INACTIVE, GRADUATED, TRANSFERRED)',
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  // --- Active Enrollment Corrections (Optional) ---
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description:
      'Update section in current active enrollment (must belong to enrolled class)',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    description: 'Update group in current active enrollment',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440004',
    description: 'Update optional 4th subject in current active enrollment',
  })
  @IsOptional()
  @IsUUID()
  optionalSubjectId?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Update roll number in current active enrollment',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roll?: number;
}
