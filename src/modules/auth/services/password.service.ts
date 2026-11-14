import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { OtpService } from './otp.service';
import { OtpType } from '../constants/auth.constant';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  NotFoundException,
  UnauthorizedException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly otpService: OtpService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedInput = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedInput }, { phone: dto.email.trim() }],
      },
    });

    if (!user || !user.email) {
      throw new NotFoundException('User with this email/phone not found');
    }

    // Send 6-digit OTP via OtpService
    await this.otpService.sendOtp(user.email, OtpType.PASSWORD_RESET);

    return ResponseHelper.success(
      { email: user.email },
      'Password reset OTP has been sent to your email. Please verify the code to proceed.',
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const resetSecret =
        this.configService.get<string>('jwt.accessSecret') ||
        (this.configService.get<string>('JWT_ACCESS_SECRET') as string);

      const decoded = this.jwtService.verify(dto.resetToken, {
        secret: resetSecret,
      });

      if (decoded.purpose !== 'reset-password') {
        throw new UnauthorizedException('Invalid token purpose');
      }

      // Check single-use token in Redis
      const storedToken = await this.redisService.get(
        `reset_token:${decoded.sub}`,
      );
      if (!storedToken || storedToken !== dto.resetToken) {
        throw new UnauthorizedException(
          'Reset token has already been used or has expired',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const saltRounds =
        (this.configService.get<number>('app.bcryptSaltRounds') as number) ||
        10;
      const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      // Clear reset token and revoke current sessions
      await this.redisService.del(`reset_token:${user.id}`);
      await this.redisService.del(`refresh_token:${user.id}`);
      await this.redisService.set(
        `user_logout:${user.id}`,
        Date.now().toString(),
        15 * 60,
      );

      return ResponseHelper.success(
        null,
        'Password reset successfully. Please login with your new password.',
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password does not match');
    }

    const saltRounds =
      (this.configService.get<number>('app.bcryptSaltRounds') as number) || 10;
    const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return ResponseHelper.success(null, 'Password changed successfully');
  }
}
