import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { OtpController } from './controllers/otp.controller';
import { PasswordController } from './controllers/password.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailService } from '../../shared/mail/email-service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret') as string,
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiresIn') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    OtpController,
    PasswordController,
    RoleController,
    PermissionController,
  ],
  providers: [
    AuthService,
    OtpService,
    PasswordService,
    RoleService,
    PermissionService,
    EmailService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    OtpService,
    PasswordService,
    RoleService,
    PermissionService,
    JwtModule,
  ],
})
export class AuthModule {}
