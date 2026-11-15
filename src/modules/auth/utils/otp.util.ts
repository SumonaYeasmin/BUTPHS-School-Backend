import * as crypto from 'crypto';

export const generateOtpCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

