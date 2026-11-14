import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { EmailService } from '../../../shared/mail/email-service';
import { getOtpEmailContent } from '../../../shared/mail/templates/otp-email.template';
import { generateOtpCode } from '../utils/otp.util';
import { generateTokens } from '../utils/token.util';
import { OtpType } from '../constants/auth.constant';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  NotFoundException,
  OtpInvalidException,
  TooManyAttemptsException,
  ServiceUnavailableException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(email: string, type: OtpType, isResend = false): Promise<string> {
    const code = generateOtpCode();
    const normalizedEmail = email.trim().toLowerCase();
    const otpKey = `otp:${type}:${normalizedEmail}`;
    const attemptsKey = `otp_attempts:${type}:${normalizedEmail}`;

    // Store OTP in Redis for 10 minutes (600s)
    await this.redisService.set(otpKey, code, 600);
    await this.redisService.del(attemptsKey);

    const emailContent = getOtpEmailContent(code, type, isResend);
    const isSent = await this.emailService.sendEmail(
      normalizedEmail,
      emailContent.subject,
      emailContent.html,
    );

    if (!isSent) {
      // In development, if SMTP is not configured, we still allow local testing
      console.warn(`[DEV NOTE] OTP for ${normalizedEmail} (${type}): ${code}`);
    }

    return code;
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.email }],
      },
    });

    if (!user || !user.email) {
      throw new NotFoundException('User with this email not found');
    }

    await this.sendOtp(user.email, dto.type, true);

    return ResponseHelper.success(
      null,
      'A new verification code has been sent to your email.',
    );
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedEmail }],
      },
      include: {
        staff: true,
        parent: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otpKey = `otp:${dto.type}:${normalizedEmail}`;
    const attemptsKey = `otp_attempts:${dto.type}:${normalizedEmail}`;

    const currentAttempts = await this.redisService.get(attemptsKey);
    if (currentAttempts && parseInt(currentAttempts, 10) >= 5) {
      throw new TooManyAttemptsException();
    }

    const storedCode = await this.redisService.get(otpKey);
    if (!storedCode || storedCode !== dto.code) {
      const newAttempts = await this.redisService.incr(attemptsKey);
      if (newAttempts === 1) {
        await this.redisService.expire(attemptsKey, 600);
      }
      throw new OtpInvalidException();
    }

    // OTP is valid - delete OTP and attempts from Redis
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);

    if (dto.type === OtpType.ACCOUNT_VERIFY) {
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
        include: {
          staff: true,
          parent: true,
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      const roles = updatedUser.userRoles.map((ur) => ur.role.name);
      const permissions = Array.from(
        new Set(
          updatedUser.userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.name),
          ),
        ),
      );

      const payload = {
        sub: updatedUser.id,
        email: updatedUser.email,
        roles,
        permissions,
        role: roles[0] || null,
      };

      const { accessToken, refreshToken } = generateTokens(
        this.jwtService,
        this.configService,
        payload,
      );

      return ResponseHelper.success(
        {
          accessToken,
          refreshToken,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            roles,
            permissions,
          },
        },
        'Account verified successfully. You are now logged in.',
      );
    } else if (dto.type === OtpType.PASSWORD_RESET) {
      const resetSecret =
        this.configService.get<string>('jwt.accessSecret') ||
        (this.configService.get<string>('JWT_ACCESS_SECRET') as string);

      const resetToken = this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: 'reset-password' },
        { secret: resetSecret, expiresIn: '15m' },
      );

      // Save resetToken in Redis for single-use protection
      await this.redisService.set(`reset_token:${user.id}`, resetToken, 15 * 60);

      return ResponseHelper.success(
        { resetToken },
        'OTP verified. Proceed to reset your password.',
      );
    }

    return ResponseHelper.success(null, 'OTP verified successfully');
  }
}

