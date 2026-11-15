import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { OtpService } from './otp.service';
import { OtpType } from '../constants/auth.constant';
import {
  ConflictException,
  InvalidCredentialsException,
  NotFoundException,
  UnauthorizedException,
} from '../../../common/exceptions/business.exception';
import { ConfigService } from '@nestjs/config';
import { generateTokens } from '../utils/token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    const saltRounds =
      (this.configService.get<number>('app.bcryptSaltRounds') as number) || 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    let user;

    if (existingUser) {
      if (existingUser.isActive) {
        throw new ConflictException('User with this email or phone already exists');
      }
      // If user registered previously but didn't verify OTP, update credentials and re-trigger OTP
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: dto.name,
          passwordHash: hashedPassword,
          phone: dto.phone || existingUser.phone,
        },
      });
    } else {
      const defaultRole = await this.prisma.role.findFirst({
        where: { name: { in: ['STUDENT', 'PARENT', 'USER'] } },
      });

      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: normalizedEmail,
          phone: dto.phone || null,
          passwordHash: hashedPassword,
          isActive: false, // Inactive until OTP is verified
          ...(defaultRole
            ? {
                userRoles: {
                  create: {
                    roleId: defaultRole.id,
                  },
                },
              }
            : {}),
        },
      });
    }

    // Send 6-digit verification OTP to user's email
    await this.otpService.sendOtp(normalizedEmail, OtpType.ACCOUNT_VERIFY);

    this.eventEmitter.emit('activity.log', {
      type: 'USER_REGISTER_INITIATED',
      message: `${user.email} registered (pending OTP verification)`,
      metadata: { userId: user.id },
    });

    return ResponseHelper.created(
      {
        userId: user.id,
        email: user.email,
        isVerified: false,
      },
      'Registration successful! Please check your email for the 6-digit verification code.',
    );
  }

  async login(dto: LoginDto) {
    const normalizedInput = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedInput }, { phone: dto.email.trim() }],
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

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    // If account has not verified OTP yet
    if (!user.isActive) {
      if (user.email) {
        await this.otpService.sendOtp(user.email, OtpType.ACCOUNT_VERIFY);
      }
      throw new UnauthorizedException(
        'Your account is not verified yet. A new verification OTP has been sent to your email. Please verify your account to continue.',
      );
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name),
        ),
      ),
    );

    this.eventEmitter.emit('activity.log', {
      type: 'USER_LOGIN',
      message: `${user.email || user.name} logged in`,
      metadata: { userId: user.id },
    });

    const payload = {
      sub: user.id,
      email: user.email,
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
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roles,
          permissions,
        },
      },
      'Login successful',
    );
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: true,
        parent: {
          include: {
            students: {
              include: {
                student: true,
              },
            },
          },
        },
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
      throw new NotFoundException('User');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name),
        ),
      ),
    );

    return ResponseHelper.success({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      roles,
      permissions,
      staff: user.staff || null,
      parent: user.parent || null,
      createdAt: user.createdAt,
    });
  }
}
