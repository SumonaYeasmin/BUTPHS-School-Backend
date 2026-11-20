import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
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
    description: 'English full name of the student',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameEn?: string;

  @ApiPropertyOptional({
    example: 'মোঃ রাহাত হোসেন',
    description: 'Bengali full name of the student',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameBn?: string;

  @ApiPropertyOptional({
    example: 'Md. Rahat Hossain',
    description: 'Legacy full name (maps to nameEn)',
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
    description: 'পিতার মোবাইল নম্বর',
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
    description: 'প্রাপ্ত জিপিএ',
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

  // --- Active Enrollment Form Details (Optional) ---
  @ApiPropertyOptional({
    example: '৬৮',
    description: 'ভর্তি ফরমের ক্রমিক নম্বর',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  formSerialNo?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'ড্রপ বা একই শ্রেণিতে পুনরাবৃত্তি কি না',
  })
  @IsOptional()
  @IsBoolean()
  isRepeater?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'নতুন ভর্তি নাকি পুনঃভর্তি',
  })
  @IsOptional()
  @IsBoolean()
  isReadmission?: boolean;

  @ApiPropertyOptional({
    example: 'মন্তব্য',
    description: 'ভর্তি সম্পর্কিত মন্তব্য বা নোট',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

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
    description: 'Update optional 4th ClassSubject in current active enrollment',
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
