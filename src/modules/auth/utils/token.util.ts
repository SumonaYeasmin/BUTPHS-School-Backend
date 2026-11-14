import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const generateTokens = (
  jwtService: JwtService,
  configService: ConfigService,
  payload: any,
) => {
  const accessToken = jwtService.sign(payload);
  const refreshExpiresIn =
    configService.get<string>('jwt.refreshTokenExpiresIn') ||
    configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ||
    '30d';

  const refreshSecret =
    configService.get<string>('jwt.refreshSecret') ||
    (configService.get<string>('JWT_REFRESH_SECRET') as string);

  const refreshToken = jwtService.sign(payload, {
    secret: refreshSecret,
    expiresIn: refreshExpiresIn as any,
  });

  return { accessToken, refreshToken };
};
