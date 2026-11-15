import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OtpType } from '../constants/auth.constant';

export class ResendOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: OtpType,
    example: OtpType.ACCOUNT_VERIFY,
    description: 'Purpose of OTP: ACCOUNT_VERIFY or PASSWORD_RESET',
  })
  @IsEnum(OtpType)
  @IsNotEmpty()
  type: OtpType;
}

