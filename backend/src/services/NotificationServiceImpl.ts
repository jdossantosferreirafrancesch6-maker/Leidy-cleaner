import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

type NotifyOptions = {
  toEmail?: string;
  toPhone?: string;
  subject?: string;
  text?: string;
  html?: string;
};

class NotificationServiceImpl {
  private static transporter: any | null = null;

  private static getTransporter() {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      logger.info('NotificationServiceImpl: SMTP transporter configured');
    } else {
      this.transporter = {
        sendMail: async (opts: any) => {
          logger.info('NotificationServiceImpl (log fallback) sendMail', opts);
          return { accepted: [opts.to], messageId: 'log-fallback' };
        }
      };
      logger.warn('NotificationServiceImpl: SMTP not configured, using log fallback');
    }

    return this.transporter;
  }

  static async sendEmail(opts: NotifyOptions) {
    if (!opts.toEmail) {
      logger.warn('NotificationServiceImpl.sendEmail called without toEmail');
      return;
    }

    const transporter = this.getTransporter();
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@leidycleaner.com',
        to: opts.toEmail,
        subject: opts.subject || 'Notificação',
        text: opts.text,
        html: opts.html
      });
      logger.info('NotificationServiceImpl: email sent', { to: opts.toEmail, messageId: info.messageId });
      return info;
    } catch (err) {
      logger.error('NotificationServiceImpl: email send failed', err);
      throw err;
    }
  }

  static async sendSMS(toPhone?: string, message?: string) {
    if (!toPhone) {
      logger.warn('NotificationServiceImpl.sendSMS called without toPhone');
      return;
    }
    logger.info('NotificationServiceImpl: sendSMS (log)', { to: toPhone, message });
    return { to: toPhone, status: 'logged' };
  }
}

export default NotificationServiceImpl;
