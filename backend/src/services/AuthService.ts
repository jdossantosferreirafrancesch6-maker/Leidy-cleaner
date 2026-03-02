import { query, DB_TYPE } from '../utils/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import { User, UserResponse, JWTPayload } from '../types/auth';
import crypto from 'crypto';
import { decodeToken } from '../utils/jwt';
import { sqlNow } from '../utils/sql';

export class AuthService {
  static async register(
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw ApiError('User with this email already exists', 400);
    }

    // Determine role: first registered user becomes admin when no admin exists
    const adminCheck = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const roleToAssign = ((adminCheck as any[])[0] as any).count === '0' || ((adminCheck as any[])[0] as any).count === 0
      ? 'admin'
      : 'customer';

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user. SQLite has spotty RETURNING support via sqlite3 driver, so
    // we handle sqlite separately.
    let user: any;
    if (DB_TYPE === 'sqlite') {
      logger.debug('SQLite insert for new user ' + JSON.stringify({ email, name, role: roleToAssign }));
      await query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, ${sqlNow()}, ${sqlNow()})`,
        [email, passwordHash, name, phone || null, roleToAssign]
      );
      const afterCount = await query('SELECT COUNT(*) as cnt FROM users');
      logger.debug('SQLite users count after insert ' + JSON.stringify(afterCount[0]));
      // fetch the row we just inserted
      const lookup = await query(
        DB_TYPE === 'sqlite'
          ? 'SELECT rowid as id, email, full_name, phone, role, created_at FROM users WHERE email = $1'
          : 'SELECT id, email, full_name, phone, role, created_at FROM users WHERE email = $1',
        [email]
      );
      user = lookup[0];
      logger.debug('SQLite lookup result for new user ' + JSON.stringify(user));
    } else {
      const result = await query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, ${sqlNow()}, ${sqlNow()})
         RETURNING id, email, full_name, phone, role, created_at`,
        [email, passwordHash, name, phone || null, roleToAssign]
      );
      user = result[0];
      logger.debug('AuthService.register returned row:', JSON.stringify(user));
    }

    if (!user || user.id === undefined || user.id === null) {
      throw new Error('Failed to register user: no id returned from database');
    }

    const userIdStr = String(user.id);

    // Generate tokens
    const payload: JWTPayload = {
      id: userIdStr,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(payload);

    // persist refresh token for revocation support
    await AuthService.saveRefreshToken(user.id, refreshToken);

    logger.info(`✅ User registered: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        phone: user.phone,
        role: user.role,
        bio: user.bio,
        photoUrl: user.photo_url,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    // Get user by email
    const users = await query(
      DB_TYPE === 'sqlite'
        ? 'SELECT rowid as id, email, full_name, phone, role, password_hash, bio, photo_url FROM users WHERE email = $1'
        : 'SELECT id, email, full_name, phone, role, password_hash, bio, photo_url FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      throw ApiError('Invalid email or password', 400);
    }

    const user = users[0];
    logger.debug('AuthService.login fetched user ' + JSON.stringify(user));
    if (!user.id) {
      throw new Error('User record missing id');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw ApiError('Invalid email or password', 400);
    }

    // Generate tokens
    const payload: JWTPayload = {
      id: String(user.id),
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(payload);

    logger.info(`✅ User logged in: ${email}`);

    // persist refresh token
    await AuthService.saveRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        phone: user.phone,
        role: user.role,
        bio: user.bio,
        photoUrl: user.photo_url,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // verify token signature first
    const payload = verifyRefreshToken(refreshToken);

    // ensure token is not revoked
    const revoked = await AuthService.isRefreshTokenRevoked(refreshToken);
    if (revoked) {
      throw ApiError('Invalid refresh token', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });

    // save new refresh token and revoke old one
    await AuthService.saveRefreshToken(String(payload.id), newRefreshToken);
    await AuthService.revokeRefreshToken(refreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  static hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async saveRefreshToken(userId: string | number, token: string) {
    const tokenHash = AuthService.hashToken(token);
    const decoded: any = decodeToken(token) || {};
    const expiresAt = decoded && decoded.exp ? new Date((decoded.exp as number) * 1000) : null;

    // for debugging SQLite foreign key issues, log the userId and confirm it exists
    if (DB_TYPE === 'sqlite') {
      try {
        const exists = await query('SELECT id FROM users WHERE id = $1', [userId]);
        logger.debug('saveRefreshToken: user existence check ' + JSON.stringify({ userId, exists }));
      } catch (checkErr) {
        logger.debug('saveRefreshToken: user existence check failed ' + JSON.stringify({ userId, checkErr: String(checkErr) }));
      }
    }

    try {
      logger.debug('saveRefreshToken: attempting insert ' + JSON.stringify({ userId, tokenHash, expiresAt }));
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked, created_at) VALUES ($1, $2, $3, false, ${sqlNow()})`,
        [userId, tokenHash, expiresAt]
      );
    } catch (err) {
      // log details to help diagnose FK problems
      logger.debug('saveRefreshToken: insert error (possibly duplicate or FK) ' +
        JSON.stringify({
          err: err && typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err),
          userId,
        }));
    }
  }

  static async revokeRefreshToken(token: string) {
    const tokenHash = AuthService.hashToken(token);
    await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
  }

  static async isRefreshTokenRevoked(token: string) {
    const tokenHash = AuthService.hashToken(token);
    const rows = await query('SELECT revoked, expires_at FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    if (!rows || rows.length === 0) return true; // unknown tokens treated as revoked
    const row = rows[0] as any;
    if (row.revoked) return true;
    if (row.expires_at) {
      const exp = new Date(row.expires_at);
      if (exp.getTime() < Date.now()) return true;
    }
    return false;
  }

  static async getUserById(id: string): Promise<User | null> {
    logger.debug(`AuthService.getUserById called with id=${id}`);
    const result = await query(
      'SELECT id, email, full_name, phone, role, bio, photo_url, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (!result || result.length === 0) {
      logger.warn(`AuthService.getUserById: no user found for id=${id}`);
      return null;
    }
    return result[0];
  }

  static async updateUser(
    id: string,
    updates: Partial<User>
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.phone) {
      fields.push(`phone = $${paramCount++}`);
      values.push(updates.phone);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(updates.bio);
    }
    if (updates.photoUrl !== undefined) {
      fields.push(`photo_url = $${paramCount++}`);
      values.push(updates.photoUrl);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    fields.push(`updated_at = ${sqlNow()}`);
    values.push(id);

    const query_str = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query(query_str, values);
    return result.length > 0 ? result[0] : null;
  }

  static async getUsersByRole(role: string): Promise<User[]> {
    const result = await query(
      'SELECT id, email, full_name as name, phone, role, bio, photo_url as "photoUrl", created_at FROM users WHERE role = $1',
      [role]
    );
    return result;
  }
}
