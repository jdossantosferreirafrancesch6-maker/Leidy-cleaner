import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { AuthService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../utils/schemas';
import { t } from '../utils/i18n';

export class AuthController {
  static register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error, value } = registerSchema.validate(req.body);

    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    const { email, password, name, phone } = value;

    const result = await AuthService.register(email, password, name, phone);

    // Set refresh token as HttpOnly cookie (also return tokens in body for backwards compatibility)
    const refreshCookieMaxAge = Number(process.env.JWT_REFRESH_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const cookieOptionsReg: any = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE || 'lax') as any,
      maxAge: refreshCookieMaxAge,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: process.env.COOKIE_PATH || '/',
    };
    res.cookie('refreshToken', result.refreshToken, cookieOptionsReg);

    res.status(201).json({
      message: t('userRegistered'),
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  });

  static login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    const { email, password } = value;

    const result = await AuthService.login(email, password);

    const refreshCookieMaxAge = Number(process.env.JWT_REFRESH_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const cookieOptionsLogin: any = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE || 'lax') as any,
      maxAge: refreshCookieMaxAge,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: process.env.COOKIE_PATH || '/',
    };
    res.cookie('refreshToken', result.refreshToken, cookieOptionsLogin);

    res.status(200).json({
      message: t('userLoggedIn'),
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  });

  static refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Accept refresh token from body or HttpOnly cookie
    const refreshToken = (req.body && (req.body as any).refreshToken) || (req.cookies && (req.cookies as any).refreshToken);

    if (!refreshToken) {
      throw ApiError(t('refreshTokenRequired'), 400);
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    const refreshCookieMaxAge = Number(process.env.JWT_REFRESH_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const cookieOptionsRefresh: any = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE || 'lax') as any,
      maxAge: refreshCookieMaxAge,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: process.env.COOKIE_PATH || '/',
    };
    res.cookie('refreshToken', tokens.refreshToken, cookieOptionsRefresh);

    res.status(200).json({
      message: t('tokenRefreshed'),
      data: { tokens },
    });
  });

  static logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Accept refresh token from body or HttpOnly cookie
    const refreshToken = (req.body && (req.body as any).refreshToken) || (req.cookies && (req.cookies as any).refreshToken);

    if (refreshToken) {
      try {
        await AuthService.revokeRefreshToken(refreshToken);
      } catch (err) {
        // ignore revoke errors
      }
    }

    // clear cookie
    const cookieOptionsLogout: any = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE || 'lax') as any,
      maxAge: 0,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: process.env.COOKIE_PATH || '/',
    };
    res.clearCookie('refreshToken', cookieOptionsLogout);

    res.status(200).json({ message: t('loggedOut') });
  });

  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw ApiError(t('notAuthenticated'), 401);
    }

    const user = await AuthService.getUserById(req.user.id);

    if (!user) {
      throw ApiError(t('userNotFound'), 404);
    }

    // Map full_name to name for response
    const userResponse = {
      ...user,
      name: (user as any).full_name,
    };
    delete (userResponse as any).full_name;

    res.status(200).json({
      message: t('userProfileRetrieved'),
      data: { user: userResponse },
    });
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw ApiError(t('notAuthenticated'), 401);
    }

    const { name, phone } = req.body;

    const user = await AuthService.updateUser(req.user.id, { name, phone });

    if (!user) {
      throw ApiError(t('userNotFound'), 404);
    }

    // Map full_name to name for response
    const userResponse = {
      ...user,
      name: (user as any).full_name,
    };
    delete (userResponse as any).full_name;

    res.status(200).json({
      message: t('userProfileUpdated'),
      data: { user: userResponse },
    });
  });

  // admin helper: list users by role (e.g. staff)
  static listByRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw ApiError(t('onlyAdminsListUsers'), 403);
    }
    const role = (req.query.role as string) || '';
    if (!role) {
      throw ApiError(t('roleQueryRequired'), 400);
    }
    const users = await AuthService.getUsersByRole(role);
    res.status(200).json({ message: t('usersRetrieved'), data: { users } });
  });
}
