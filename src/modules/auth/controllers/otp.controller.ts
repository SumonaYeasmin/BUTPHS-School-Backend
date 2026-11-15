import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OtpService } from '../services/otp.service';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import {
  ThrottleOtp,
  ThrottleOtpResend,
} from '../../../common/decorators/throttle.decorator';

@ApiTags('(Auth) OTP Verification')
@Controller('auth')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('verify-otp')
  @ThrottleOtp()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for account verification or password reset' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }

  @Post('resend-otp')
  @ThrottleOtpResend()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a new OTP to registered email' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.otpService.resendOtp(dto);
  }
}

