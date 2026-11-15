import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { OtpType } from '../constants/auth.constant';

export class VerifyOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @ApiProperty({
    enum: OtpType,
    example: OtpType.ACCOUNT_VERIFY,
    description: 'Purpose of OTP: ACCOUNT_VERIFY or PASSWORD_RESET',
  })
  @IsEnum(OtpType)
  @IsNotEmpty()
  type: OtpType;
}

