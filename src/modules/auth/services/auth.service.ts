import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    const saltRounds =
      (this.configService.get<number>('app.bcryptSaltRounds') as number) || 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const defaultRole = await this.prisma.role.findFirst({
      where: { name: { in: ['STUDENT', 'PARENT', 'TEACHER'] } },
    });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        passwordHash: hashedPassword,
        isActive: true,
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
      include: {
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

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name),
        ),
      ),
    );

    this.eventEmitter.emit('activity.log', {
      type: 'USER_REGISTERED',
      message: `${user.email} registered`,
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

    return ResponseHelper.created(
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
      'User registered successfully',
    );
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.email }],
      },
      include: {
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

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account is deactivated. Please contact administration.',
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
      createdAt: user.createdAt,
    });
  }
}
