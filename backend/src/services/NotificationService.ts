import nodemailer from 'nodemailer';
import { logger } from '../utils/logger-advanced';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface BookingData {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  scheduledDate: string;
  totalPrice: number;
  address?: string;
  notes?: string;
}

export interface PaymentData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  serviceName: string;
}

export interface StaffAssignmentData {
  staffName: string;
  staffEmail: string;
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  address?: string;
}

export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Template para confirmação de agendamento
  private getBookingConfirmationTemplate(data: BookingData): EmailTemplate {
    const formattedDate = new Date(data.scheduledDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      subject: `✅ Agendamento Confirmado - Leidy Cleaner`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Agendamento Confirmado!</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Olá ${data.customerName}!</h2>

            <p style="color: #6b7280; line-height: 1.6;">
              Seu agendamento foi confirmado com sucesso. Aqui estão os detalhes:
            </p>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">📋 Detalhes do Serviço</h3>
              <p><strong>Serviço:</strong> ${data.serviceName}</p>
              <p><strong>Data e Hora:</strong> ${formattedDate}</p>
              <p><strong>Valor Total:</strong> R$ ${data.totalPrice.toFixed(2)}</p>
              ${data.address ? `<p><strong>Endereço:</strong> ${data.address}</p>` : ''}
              ${data.notes ? `<p><strong>Observações:</strong> ${data.notes}</p>` : ''}
            </div>

            <div style="background: #ecfdf5; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #065f46; margin-top: 0;">📞 O que acontece agora?</h4>
              <ul style="color: #065f46; margin: 10px 0;">
                <li>Nosso time entrará em contato para confirmar detalhes</li>
                <li>Você receberá lembretes 24h e 2h antes do serviço</li>
                <li>Em caso de dúvidas, ligue: (11) 99999-9999</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard"
                 style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Ver Meus Agendamentos
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Leidy Cleaner - Serviços de Limpeza Profissional<br>
              CNPJ: 12.345.678/0001-90 | contato@leidycleaner.com.br
            </p>
          </div>
        </div>
      `,
      text: `
        Olá ${data.customerName}!

        Seu agendamento foi confirmado com sucesso!

        Detalhes do Serviço:
        - Serviço: ${data.serviceName}
        - Data e Hora: ${formattedDate}
        - Valor Total: R$ ${data.totalPrice.toFixed(2)}
        ${data.address ? `- Endereço: ${data.address}` : ''}
        ${data.notes ? `- Observações: ${data.notes}` : ''}

        Nosso time entrará em contato para confirmar detalhes.
        Você receberá lembretes 24h e 2h antes do serviço.

        Acesse: ${process.env.FRONTEND_URL}/dashboard

        Leidy Cleaner - Serviços de Limpeza Profissional
      `
    };
  }

  // Template para lembrete de agendamento
  private getBookingReminderTemplate(data: BookingData, hoursUntil: number): EmailTemplate {
    const timeLabel = hoursUntil === 24 ? '24 horas' : '2 horas';

    return {
      subject: `⏰ Lembrete: Serviço em ${timeLabel} - Leidy Cleaner`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Lembrete de Serviço</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Olá ${data.customerName}!</h2>

            <p style="color: #6b7280; line-height: 1.6;">
              Este é um lembrete automático do seu serviço agendado para <strong>${timeLabel}</strong>.
            </p>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">📅 Detalhes do Serviço</h3>
              <p><strong>Serviço:</strong> ${data.serviceName}</p>
              <p><strong>Data e Hora:</strong> ${new Date(data.scheduledDate).toLocaleString('pt-BR')}</p>
              ${data.address ? `<p><strong>Endereço:</strong> ${data.address}</p>` : ''}
            </div>

            <p style="color: #6b7280;">
              Nossa equipe chegará no horário agendado. Em caso de imprevistos, entre em contato conosco.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:+5511999999999"
                 style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📞 Ligar Agora
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        Olá ${data.customerName}!

        LEMBRETE: Seu serviço está agendado para ${timeLabel}.

        Detalhes:
        - Serviço: ${data.serviceName}
        - Data e Hora: ${new Date(data.scheduledDate).toLocaleString('pt-BR')}
        ${data.address ? `- Endereço: ${data.address}` : ''}

        Nossa equipe chegará no horário agendado.
        Em caso de dúvidas: (11) 99999-9999

        Leidy Cleaner
      `
    };
  }

  // Template para confirmação de pagamento
  private getPaymentConfirmationTemplate(data: PaymentData): EmailTemplate {
    return {
      subject: `💳 Pagamento Confirmado - Leidy Cleaner`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💳 Pagamento Confirmado!</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Olá ${data.customerName}!</h2>

            <p style="color: #6b7280; line-height: 1.6;">
              Seu pagamento foi processado com sucesso. Aqui estão os detalhes:
            </p>

            <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">💰 Detalhes do Pagamento</h3>
              <p><strong>Serviço:</strong> ${data.serviceName}</p>
              <p><strong>Valor Pago:</strong> R$ ${data.amount.toFixed(2)}</p>
              <p><strong>ID do Agendamento:</strong> ${data.bookingId}</p>
              <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">APROVADO ✅</span></p>
            </div>

            <p style="color: #6b7280;">
              Seu serviço está confirmado e nossa equipe será pontual.
              Você receberá atualizações sobre o status do serviço.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard"
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Acompanhar Serviço
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        Olá ${data.customerName}!

        ✅ PAGAMENTO CONFIRMADO

        Detalhes:
        - Serviço: ${data.serviceName}
        - Valor Pago: R$ ${data.amount.toFixed(2)}
        - ID do Agendamento: ${data.bookingId}
        - Status: APROVADO

        Seu serviço está confirmado!

        Acompanhe: ${process.env.FRONTEND_URL}/dashboard

        Leidy Cleaner
      `
    };
  }

  // Template para solicitação de avaliação
  private getReviewRequestTemplate(data: BookingData): EmailTemplate {
    return {
      subject: `⭐ Como foi nosso serviço? - Leidy Cleaner`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⭐ Avalie Nosso Serviço</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Olá ${data.customerName}!</h2>

            <p style="color: #6b7280; line-height: 1.6;">
              Esperamos que tenha ficado satisfeito com nosso serviço de limpeza.
              Sua opinião é muito importante para nós!
            </p>

            <div style="background: #faf5ff; border: 1px solid #8b5cf6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #6d28d9; margin-top: 0;">📋 Serviço Realizado</h3>
              <p><strong>Serviço:</strong> ${data.serviceName}</p>
              <p><strong>Data:</strong> ${new Date(data.scheduledDate).toLocaleDateString('pt-BR')}</p>
            </div>

            <p style="color: #6b7280;">
              Clique no botão abaixo para deixar sua avaliação. Leva menos de 1 minuto!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/review/${data.id}"
                 style="background: #8b5cf6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ⭐ Deixar Avaliação
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Sua avaliação nos ajuda a melhorar nossos serviços e ajuda outros clientes a escolher o melhor para eles.
            </p>
          </div>
        </div>
      `,
      text: `
        Olá ${data.customerName}!

        ⭐ AVALIE NOSSO SERVIÇO

        Esperamos que tenha ficado satisfeito com nosso serviço de limpeza.
        Sua opinião é muito importante!

        Serviço realizado: ${data.serviceName}
        Data: ${new Date(data.scheduledDate).toLocaleDateString('pt-BR')}

        Deixe sua avaliação: ${process.env.FRONTEND_URL}/review/${data.id}

        Leidy Cleaner
      `
    };
  }

  // Template para notificação de staff
  private getStaffAssignmentTemplate(data: StaffAssignmentData): EmailTemplate {
    return {
      subject: `🧹 Novo Agendamento Atribuído - Leidy Cleaner`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧹 Novo Agendamento</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Olá ${data.staffName}!</h2>

            <p style="color: #6b7280; line-height: 1.6;">
              Você foi atribuído a um novo serviço. Aqui estão os detalhes:
            </p>

            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">📋 Detalhes do Serviço</h3>
              <p><strong>Cliente:</strong> ${data.customerName}</p>
              <p><strong>Serviço:</strong> ${data.serviceName}</p>
              <p><strong>Data e Hora:</strong> ${new Date(data.scheduledDate).toLocaleString('pt-BR')}</p>
              ${data.address ? `<p><strong>Endereço:</strong> ${data.address}</p>` : ''}
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">⚠️ Lembretes Importantes</h4>
              <ul style="color: #92400e; margin: 10px 0;">
                <li>Chegue 10 minutos antes do horário marcado</li>
                <li>Leve todos os equipamentos necessários</li>
                <li>Confirme o endereço com o cliente se necessário</li>
                <li>Atualize o status do serviço no app</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/staff/dashboard"
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Ver Meus Serviços
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        Olá ${data.staffName}!

        NOVO AGENDAMENTO ATRIBUÍDO

        Detalhes:
        - Cliente: ${data.customerName}
        - Serviço: ${data.serviceName}
        - Data e Hora: ${new Date(data.scheduledDate).toLocaleString('pt-BR')}
        ${data.address ? `- Endereço: ${data.address}` : ''}

        Lembretes:
        - Chegue 10 minutos antes
        - Leve equipamentos necessários
        - Confirme endereço se necessário
        - Atualize status no app

        Ver serviços: ${process.env.FRONTEND_URL}/staff/dashboard

        Leidy Cleaner
      `
    };
  }

  // Método genérico para enviar email
  private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    try {
      const mailOptions = {
        from: `"Leidy Cleaner" <${process.env.SMTP_USER}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email enviado com sucesso para ${to}: ${info.messageId}`);
    } catch (error) {
      logger.error(`❌ Erro ao enviar email para ${to}:`, error);
      throw error;
    }
  }

  // Métodos públicos para diferentes tipos de notificação
  async sendBookingConfirmation(data: BookingData): Promise<void> {
    const template = this.getBookingConfirmationTemplate(data);
    await this.sendEmail(data.customerEmail, template);
  }

  async sendBookingReminder(data: BookingData, hoursUntil: number): Promise<void> {
    const template = this.getBookingReminderTemplate(data, hoursUntil);
    await this.sendEmail(data.customerEmail, template);
  }

  async sendPaymentConfirmation(data: PaymentData): Promise<void> {
    const template = this.getPaymentConfirmationTemplate(data);
    await this.sendEmail(data.customerEmail, template);
  }

  async sendReviewRequest(data: BookingData): Promise<void> {
    const template = this.getReviewRequestTemplate(data);
    await this.sendEmail(data.customerEmail, template);
  }

  async sendStaffAssignment(data: StaffAssignmentData): Promise<void> {
    const template = this.getStaffAssignmentTemplate(data);
    await this.sendEmail(data.staffEmail, template);
  }

  // Método para testar conexão SMTP
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('✅ Conexão SMTP verificada com sucesso');
      return true;
    } catch (error) {
      logger.error('❌ Erro na conexão SMTP:', error);
      return false;
    }
  }

  // Método legado para compatibilidade
  static async sendEmail(to: string, subject: string, text: string) {
    const service = new NotificationService();
    await service.sendEmail(to, { subject, html: text, text });
  }

  static async sendSMS(to: string, text: string) {
    // TODO: Implementar SMS com Twilio
    logger.info(`📱 SMS enviado para ${to}: ${text}`);
  }

  static async notifyBookingCreated(booking: any) {
    const service = new NotificationService();

    try {
      // Buscar dados do usuário
      const { query } = await import('../utils/database');
      const users = await query('SELECT email, full_name AS name FROM users WHERE id = $1', [booking.user_id]);

      if (users.length > 0) {
        const user = users[0];
        const bookingData: BookingData = {
          id: booking.id,
          customerName: user.name,
          customerEmail: user.email,
          serviceName: booking.service_name || 'Serviço de Limpeza',
          scheduledDate: booking.scheduled_date,
          totalPrice: booking.total_price || 0,
          address: booking.address,
          notes: booking.notes
        };

        await service.sendBookingConfirmation(bookingData);
      }

      // Notificar staff se atribuído
      if (booking.staff_id) {
        const staffRows = await query('SELECT email, full_name AS name FROM users WHERE id = $1', [booking.staff_id]);
        if (staffRows.length > 0) {
          const staff = staffRows[0];
          const staffData: StaffAssignmentData = {
            staffName: staff.name,
            staffEmail: staff.email,
            customerName: users[0]?.name || 'Cliente',
            serviceName: booking.service_name || 'Serviço de Limpeza',
            scheduledDate: booking.scheduled_date,
            address: booking.address
          };

          await service.sendStaffAssignment(staffData);
        }
      }
    } catch (err) {
      logger.error('[Notification] Erro em notifyBookingCreated:', err);
    }
  }
}

// Exportar instância singleton
export const notificationService = new NotificationService();
export default NotificationService;
