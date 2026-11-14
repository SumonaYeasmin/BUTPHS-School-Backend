import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { EmailService } from '../../../shared/mail/email-service';
import { baseEmailTemplate } from '../../../shared/mail/templates/base-email.template';
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
    private readonly emailService: EmailService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.email }],
      },
    });

    if (!user) {
      throw new NotFoundException('User with this email/phone not found');
    }

    const resetSecret =
      this.configService.get<string>('jwt.accessSecret') ||
      (this.configService.get<string>('JWT_ACCESS_SECRET') as string);

    // 15 minutes validity
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'reset-password' },
      { secret: resetSecret, expiresIn: '15m' },
    );

    // Save token in Redis for single-use protection (TTL: 15 min = 900s)
    await this.redisService.set(`reset_token:${user.id}`, resetToken, 15 * 60);

    // If user has email, send instructions
    if (user.email) {
      const subject = 'Password Reset Request';
      const content = `
        <p style="color: #cccccc; line-height: 1.6;">
          Hello <strong>${user.name}</strong>,<br><br>
          We received a request to reset your password. Use the following reset token to set a new password. This token is valid for 15 minutes:
        </p>
        <div style="background-color: rgba(255, 255, 255, 0.1); border: 1px solid #7F41F0; border-radius: 8px; padding: 15px; font-family: monospace; word-break: break-all; color: #fff; margin: 20px 0; font-size: 13px;">
          ${resetToken}
        </div>
        <p style="color: #cccccc; font-size: 13px;">
          If you did not request a password reset, please ignore this email.
        </p>
      `;
      await this.emailService.sendEmail(
        user.email,
        subject,
        baseEmailTemplate('Password Reset Request', content),
      );
    }

    return ResponseHelper.success(
      { resetToken },
      'Password reset instructions sent. Token is valid for 15 minutes.',
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

      // Clear reset token and invalidate current sessions in Redis
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

