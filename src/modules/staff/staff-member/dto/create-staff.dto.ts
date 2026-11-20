import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BloodGroup,
  EmploymentType,
  Gender,
  Religion,
  StaffStatus,
  StaffType,
} from '../../../../../prisma/generated/client';

export class CreateStaffDto {
  @ApiPropertyOptional({
    example: 'T-2026-0001',
    description: 'Unique Employee / Staff ID (auto-generated if omitted)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employeeId?: string;

  @ApiProperty({
    example: 'মো. রফিকুল ইসলাম / Md. Rafiqul Islam',
    description: 'Full name of the staff member / teacher',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: 'https://example.com/photos/staff1.jpg',
    description: 'Staff profile photo URL',
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({
    example: 'সহকারী শিক্ষক (গণিত)',
    description:
      'Designation title (auto-populated from Staff Structure if staffStructureId is provided)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({
    example: 'M.Sc in Mathematics, B.Ed (1st Class)',
    description: 'Educational qualification and certifications',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  qualification?: string;

  @ApiPropertyOptional({
    enum: StaffType,
    example: StaffType.TEACHER,
    description:
      'Staff category (TEACHER, OFFICER, EMPLOYEE). Auto-populated if staffStructureId is provided.',
  })
  @IsEnum(StaffType)
  @IsOptional()
  staffType?: StaffType;

  @ApiPropertyOptional({
    description: 'UUID of the department (e.g. Science, Accounts, Administration)',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the approved post in Staff Structure (জনবল কাঠামো)',
  })
  @IsUUID()
  @IsOptional()
  staffStructureId?: string;

  @ApiPropertyOptional({
    enum: EmploymentType,
    example: EmploymentType.PERMANENT,
    description: 'Employment type (PERMANENT, PROBATIONARY, CONTRACTUAL, PART_TIME)',
    default: EmploymentType.PERMANENT,
  })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType = EmploymentType.PERMANENT;

  // --- Personal & Demographic Info ---
  @ApiPropertyOptional({ example: 'মো. আব্দুল করিম', description: "Father's name" })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  fatherName?: string;

  @ApiPropertyOptional({ example: 'মোসা. রহিমা বেগম', description: "Mother's name" })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  motherName?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE, description: 'Gender' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '1988-06-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '19881234567890123', description: 'National ID (NID)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  nid?: string;

  @ApiPropertyOptional({ enum: BloodGroup, example: BloodGroup.B_POSITIVE })
  @IsEnum(BloodGroup)
  @IsOptional()
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ enum: Religion, example: Religion.ISLAM })
  @IsEnum(Religion)
  @IsOptional()
  religion?: Religion;

  // --- Contact & Address ---
  @ApiPropertyOptional({ example: 'House 12, Road 4, Sector 7, Uttara, Dhaka' })
  @IsString()
  @IsOptional()
  presentAddress?: string;

  @ApiPropertyOptional({ example: 'Vill: Ramrail, Post: Send, Upazila: Brahmanbaria Sadar' })
  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @ApiPropertyOptional({ example: '01712345678', description: 'Personal phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'teacher@school.edu.bd', description: 'Email address' })
  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '01812345679', description: 'Emergency contact phone' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  emergencyContact?: string;

  // --- Employment Dates & Seniority ---
  @ApiPropertyOptional({ example: '2020-01-01', description: 'Joining date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for website and seniority hierarchy (e.g., 1 for Principal)',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    enum: StaffStatus,
    example: StaffStatus.ACTIVE,
    description: 'Current employment status (ACTIVE, RESIGNED, RETIRED, TERMINATED)',
    default: StaffStatus.ACTIVE,
  })
  @IsEnum(StaffStatus)
  @IsOptional()
  status?: StaffStatus = StaffStatus.ACTIVE;
}
