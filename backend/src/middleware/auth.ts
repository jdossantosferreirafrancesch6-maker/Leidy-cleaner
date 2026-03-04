import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { ApiError, AuthRequest } from './errorHandler';
import { t } from '../utils/i18n';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw ApiError(t('noTokenProvided'), 401);
    }

    const user = verifyToken(token);
    // normalize id to string to avoid type mismatch between DB (number) and route params
    if (user && (user as any).id !== undefined) {
      (user as any).id = String((user as any).id);
    }
    req.user = user;
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    const err = error as any;
    res.status(err.status || 401).json({
      error: {
        message: err.message || 'Authentication failed',
        status: err.status || 401,
      },
    });
  }
};

export const authorizeRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: t('notAuthenticated') });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: t('insufficientPermissions'),
      });
    }

    return next();
  };
};

export const authenticate = authenticateToken;
