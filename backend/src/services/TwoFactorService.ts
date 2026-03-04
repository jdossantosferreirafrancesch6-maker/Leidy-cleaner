import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { query } from '../utils/database';
import { logger } from '../utils/logger-advanced';
import { t } from '../utils/i18n';

export interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

export interface TwoFactorVerification {
  verified: boolean;
  message: string;
}

export class TwoFactorService {
  /**
   * Gera um segredo TOTP para um usuário
   */
  static async generateTOTPSecret(email: string): Promise<TwoFactorSecret> {
    try {
      const secret = speakeasy.generateSecret({
        name: `Leidy Cleaner (${email})`,
        issuer: 'Leidy Cleaner',
        length: 32
      });

      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: encodeURIComponent(`Leidy Cleaner (${email})`),
        issuer: 'Leidy Cleaner',
        encoding: 'base32'
      });

      const qrCode = await qrcode.toDataURL(otpauthUrl);

      return {
        secret: secret.base32,
        otpauthUrl,
        qrCode
      };
    } catch (error) {
      logger.error('Error generating TOTP secret:', error);
      throw new Error(t('failedGenerate2FASecret'));
    }
  }

  /**
   * Verifica um código TOTP
   */
  static verifyTOTPCode(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Permite uma janela de 2 códigos (30 segundos antes/depois)
      });
    } catch (error) {
      logger.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Ativa 2FA para um usuário
   */
  static async enable2FA(userId: string, secret: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET two_factor_secret = $1, two_factor_enabled = true WHERE id = $2',
        [secret, userId]
      );

      logger.info(`2FA enabled for user ${userId}`);
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw new Error(t('failedEnable2FA'));
    }
  }

  /**
   * Desativa 2FA para um usuário
   */
  static async disable2FA(userId: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = false WHERE id = $1',
        [userId]
      );

      logger.info(`2FA disabled for user ${userId}`);
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw new Error(t('failedDisable2FA'));
    }
  }

  /**
   * Verifica se 2FA está ativado para um usuário
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT two_factor_enabled FROM users WHERE id = $1',
        [userId]
      );

      return result.length > 0 && result[0].two_factor_enabled === true;
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  /**
   * Obtém o segredo 2FA de um usuário
   */
  static async get2FASecret(userId: string): Promise<string | null> {
    try {
      const result = await query(
        'SELECT two_factor_secret FROM users WHERE id = $1',
        [userId]
      );

      return result.length > 0 ? result[0].two_factor_secret : null;
    } catch (error) {
      logger.error('Error getting 2FA secret:', error);
      return null;
    }
  }

  /**
   * Valida um código 2FA durante o login
   */
  static async validate2FACode(userId: string, token: string): Promise<TwoFactorVerification> {
    try {
      const secret = await this.get2FASecret(userId);

      if (!secret) {
        return {
          verified: false,
          message: t('twoFANotEnabled')
        };
      }

      const isValid = this.verifyTOTPCode(secret, token);

      if (isValid) {
        // Registrar tentativa bem-sucedida
        await query(
          `UPDATE users SET last_2fa_verification = ${require('../utils/sql').sqlNow()} WHERE id = $1`,

          [userId]
        );

        return {
          verified: true,
          message: t('twoFAVerificationSuccessful')
        };
      } else {
        // Registrar tentativa falhada
        await query(
          'UPDATE users SET failed_2fa_attempts = COALESCE(failed_2fa_attempts, 0) + 1 WHERE id = $1',
          [userId]
        );

        return {
          verified: false,
          message: t('invalid2FACode')
        };
      }
    } catch (error) {
      logger.error('Error validating 2FA code:', error);
      return {
        verified: false,
        message: t('twoFAValidationFailed')
      };
    }
  }

  /**
   * Gera códigos de backup para recuperação
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Salva códigos de backup para um usuário
   */
  static async saveBackupCodes(userId: string, codes: string[]): Promise<void> {
    try {
      const hashedCodes = codes.map(code => require('crypto').createHash('sha256').update(code).digest('hex'));

      await query(
        'UPDATE users SET backup_codes = $1 WHERE id = $2',
        [JSON.stringify(hashedCodes), userId]
      );
    } catch (error) {
      logger.error('Error saving backup codes:', error);
      throw new Error(t('failedSaveBackupCodes'));
    }
  }

  /**
   * Valida um código de backup
   */
  static async validateBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const result = await query('SELECT backup_codes FROM users WHERE id = $1', [userId]);

      if (result.length === 0 || !result[0].backup_codes) {
        return false;
      }

      const hashedCodes: string[] = JSON.parse(result[0].backup_codes);
      const hashedCode = require('crypto').createHash('sha256').update(code).digest('hex');

      const index = hashedCodes.indexOf(hashedCode);
      if (index === -1) {
        return false;
      }

      // Remove o código usado
      hashedCodes.splice(index, 1);
      await query('UPDATE users SET backup_codes = $1 WHERE id = $2', [JSON.stringify(hashedCodes), userId]);

      return true;
    } catch (error) {
      logger.error('Error validating backup code:', error);
      return false;
    }
  }

  /**
   * Obtém estatísticas de 2FA
   */
  static async getStats(): Promise<{
    totalUsers: number;
    usersWith2FA: number;
    recentVerifications: number;
  }> {
    try {
      const totalResult = await query('SELECT COUNT(*) as count FROM users');
      const enabledResult = await query('SELECT COUNT(*) as count FROM users WHERE two_factor_enabled = true');
      const recentResult = await query(
        `SELECT COUNT(*) as count FROM users WHERE last_2fa_verification > ${require('../utils/sql').sqlAgoHours(24)}`
      );

      return {
        totalUsers: parseInt(totalResult[0].count),
        usersWith2FA: parseInt(enabledResult[0].count),
        recentVerifications: parseInt(recentResult[0].count)
      };
    } catch (error) {
      logger.error('Error getting 2FA stats:', error);
      return { totalUsers: 0, usersWith2FA: 0, recentVerifications: 0 };
    }
  }
}