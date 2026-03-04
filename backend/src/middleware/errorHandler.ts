import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import Sentry from '../utils/sentry';
import { t } from '../utils/i18n';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface CustomError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.status || 500;
  // translate message if possible
  const message = t(err.message || 'Internal Server Error');

  // Log detalhado do erro
  logger.error(`[${status}] ${message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    }
  });

  // Em produção, enviar para Sentry
  if (process.env.NODE_ENV === 'production') {
    // Capturar exceção no Sentry com contexto adicional
    Sentry.captureException(err, {
      tags: {
        service: 'backend',
        path: req.path,
        method: req.method,
      },
      extra: {
        status,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      user: (req as any).user ? {
        id: (req as any).user.id,
        email: (req as any).user.email,
      } : undefined,
    });
  }

  const response: any = {
    error: {
      message: status === 500 ? 'Internal Server Error' : message,
      status,
      timestamp: new Date().toISOString()
    },
  };

  // Em desenvolvimento, incluir mais detalhes
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
    response.error.details = err;
  }

  res.status(status).json(response);
};

export const asyncHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const ApiError = (message: string, status: number = 500): CustomError => {
  const error = new Error(message) as CustomError;
  error.status = status;
  return error;
};
