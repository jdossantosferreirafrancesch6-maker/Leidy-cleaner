import NotificationServiceImpl from './NotificationServiceImpl';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

class Notifications {
  static async notifyBookingCreated(booking: any) {
    try {
      const userRows = await query('SELECT email, full_name, phone FROM users WHERE id = $1', [booking.user_id]);
      const user = userRows && userRows[0];

      if (user && user.email) {
        await NotificationServiceImpl.sendEmail({
          toEmail: user.email,
          subject: 'Agendamento criado - Leidy Cleaner',
          text: `Olá ${user.full_name || ''}, seu agendamento ${booking.id} foi criado.`
        });
      }

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@leidycleaner.com';
      await NotificationServiceImpl.sendEmail({
        toEmail: adminEmail,
        subject: `Novo agendamento: ${booking.id}`,
        text: `Novo agendamento criado: ${booking.id}`
      });
    } catch (err) {
      logger.error('notifyBookingCreated error:', err);
    }
  }
}

export const notificationService = {
  async sendBookingReminder(data: any, hoursUntil: number) {
    const subject = `Lembrete: seu serviço em ${hoursUntil} horas`;
    const text = `Lembrete: seu serviço ${data.id} ocorrerá em breve.`;
    return NotificationServiceImpl.sendEmail({ toEmail: data.customerEmail, subject, text });
  },
  async sendReviewRequest(data: any) {
    const subject = `Avalie nosso serviço - ${data.id}`;
    const text = `Por favor, avalie o serviço ${data.id}.`;
    return NotificationServiceImpl.sendEmail({ toEmail: data.customerEmail, subject, text });
  },
  async sendBookingConfirmation(data: any) {
    const subject = `Confirmação de agendamento - ${data.id}`;
    const text = `Seu agendamento ${data.id} foi confirmado.`;
    return NotificationServiceImpl.sendEmail({ toEmail: data.customerEmail, subject, text });
  },
  async sendStaffAssignment(data: any) {
    const subject = `Novo agendamento atribuído - ${data.serviceName}`;
    const text = `Você foi atribuído ao serviço ${data.serviceName}.`;
    return NotificationServiceImpl.sendEmail({ toEmail: data.staffEmail, subject, text });
  },
  async testConnection() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
  }
};

export default Notifications;
