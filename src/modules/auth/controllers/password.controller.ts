import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PasswordService } from '../services/password.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ThrottlePasswordReset } from '../../../common/decorators/throttle.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('(Auth) Password')
@Controller('auth')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('forgot-password')
  @ThrottlePasswordReset()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset token by email or phone',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset token generated and sent',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ThrottlePasswordReset()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using the reset token',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password for currently authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or current password does not match',
  })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.passwordService.changePassword(user.id, dto);
  }
}

