import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';
import { logger } from './logger';
import { ApiError } from '../middleware/errorHandler';
import { t } from './i18n';

const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret_key') as string;
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret') as string;
const JWT_EXPIRE = (process.env.JWT_EXPIRE || '24h') as string;
const JWT_REFRESH_EXPIRE = (process.env.JWT_REFRESH_EXPIRE || '7d') as string;

export const generateTokens = (payload: JWTPayload) => {
  try {
    const accessToken = jwt.sign(payload, JWT_SECRET as jwt.Secret, {
      expiresIn: JWT_EXPIRE,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as jwt.Secret, {
      expiresIn: JWT_REFRESH_EXPIRE,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Error generating tokens:', error);
    throw new Error(t('failedGenerateTokens'));
  }
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw ApiError(t('invalidToken'), 401);
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    throw ApiError(t('invalidRefreshToken'), 401);
  }
};

export const decodeToken = (token: string) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};
