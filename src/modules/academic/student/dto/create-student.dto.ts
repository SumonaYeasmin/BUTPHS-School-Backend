import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
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

  // --- Father's Information (পিতার তথ্য) ---
  @ApiPropertyOptional({
    example: 'মোঃ রফিকুল ইসলাম',
    description: 'পিতার নাম (বাংলায়)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherNameBn?: string;

  @ApiPropertyOptional({
    example: 'Md. Rafiqul Islam',
    description: 'পিতার নাম (ইংরেজিতে)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherNameEn?: string;

  @ApiPropertyOptional({
    example: 'ব্যবসায়ী',
    description: 'পিতার পেশা',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherOccupation?: string;

  @ApiPropertyOptional({
    example: '19851234567890',
    description: 'পিতার এনআইডি নং',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fatherNid?: string;

  @ApiPropertyOptional({
    example: '01711223344',
    description: 'পিতার মোবাইল নম্বর (স্বয়ংক্রিয়ভাবে অভিভাবক প্রোফাইল তৈরিতে ব্যবহৃত হবে)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fatherPhone?: string;

  // --- Mother's Information (মাতার তথ্য) ---
  @ApiPropertyOptional({
    example: 'সালমা বেগম',
    description: 'মাতার নাম (বাংলায়)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherNameBn?: string;

  @ApiPropertyOptional({
    example: 'Salma Begum',
    description: 'মাতার নাম (ইংরেজিতে)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherNameEn?: string;

  @ApiPropertyOptional({
    example: 'গৃহিণী',
    description: 'মাতার পেশা',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherOccupation?: string;

  @ApiPropertyOptional({
    example: '19881234567890',
    description: 'মাতার এনআইডি নং',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  motherNid?: string;

  @ApiPropertyOptional({
    example: '01811223344',
    description: 'মাতার মোবাইল নম্বর',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  motherPhone?: string;

  // --- Guardian Information (অভিভাবকের তথ্য - পিতা/মাতা ব্যতীত অন্য কেউ হলে) ---
  @ApiPropertyOptional({
    example: 'আব্দুল করিম',
    description: 'অভিভাবকের নাম (যদি পিতা/মাতা ব্যতীত অন্য কেউ হন)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  guardianName?: string;

  @ApiPropertyOptional({
    example: '01911223344',
    description: 'অভিভাবকের মোবাইল নম্বর',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianPhone?: string;

  @ApiPropertyOptional({
    example: 'চাচা',
    description: 'অভিভাবকের সাথে সম্পর্ক',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guardianRelationship?: string;

  // --- Previous Academic Record (পূর্ববর্তী শিক্ষা রেকর্ড) ---
  @ApiPropertyOptional({
    example: 'মিরপুর মডেল হাই স্কুল',
    description: 'পূর্বে অধ্যয়নরত বিদ্যালয়ের নাম',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousSchoolName?: string;

  @ApiPropertyOptional({
    example: 'মিরপুর-২, ঢাকা',
    description: 'পূর্বে অধ্যয়নরত বিদ্যালয়ের ঠিকানা',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  previousSchoolAddress?: string;

  @ApiPropertyOptional({
    example: 'A+',
    description: 'পূর্ববর্তী শ্রেণিতে প্রাপ্ত গ্রেড',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  previousGrade?: string;

  @ApiPropertyOptional({
    example: 4.85,
    description: 'প্রাপ্ত জিপিএ (যেমন: 4.85)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  previousGpa?: number;

  @ApiPropertyOptional({
    example: 2024,
    description: 'পি.এস.সি/জে.এস.সি পাসের সন',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  prevExamPassingYear?: number;

  @ApiPropertyOptional({
    example: '123456',
    description: 'পরীক্ষার রোল নম্বর',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prevExamRoll?: string;

  @ApiPropertyOptional({
    example: '987654321',
    description: 'পরীক্ষার রেজিস্ট্রেশন নম্বর',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prevExamRegistration?: string;

  @ApiPropertyOptional({
    example: 5.0,
    description: 'পি.এস.সি/জে.এস.সি তে প্রাপ্ত জিপিএ',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  prevExamGpa?: number;

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
    description: 'Optional 4th ClassSubject UUID (for Class 9 and 10)',
  })
  @IsOptional()
  @IsUUID()
  optionalClassSubjectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440004',
    description: 'Alias for optionalClassSubjectId (backward compatibility)',
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

  @ApiPropertyOptional({
    example: '৬৮',
    description: 'ভর্তি ফরমের ক্রমিক নম্বর (যেমন: "৬৮")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  formSerialNo?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'ড্রপ বা একই শ্রেণিতে পুনরাবৃত্তি কি না',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRepeater?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'নতুন ভর্তি নাকি পুনঃভর্তি',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isReadmission?: boolean;

  @ApiPropertyOptional({
    example: 'পূর্বে অন্য স্কুল থেকে টিসি নিয়ে এসেছে',
    description: 'ভর্তি সম্পর্কিত বিশেষ কোনো মন্তব্য বা নোট',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

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
