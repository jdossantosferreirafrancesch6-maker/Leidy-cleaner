import nodemailer from 'nodemailer';
import { logger } from '../utils/logger-advanced';

/**
 * Serviço de Email com Nodemailer
 * Suporta: Transactional emails, Templates, Attachments
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string;
  }>;
}

interface BookingConfirmation {
  customerName: string;
  customerEmail: string;
  bookingId: string;
  serviceName: string;
  scheduledDate: string;
  address: string;
  totalPrice: number;
  notes?: string;
}

interface PaymentReceipt {
  email: string;
  transactionId: string;
  amount: number;
  method: string;
  date: string;
  bookingId: string;
  serviceName: string;
}

// Criar transporter do Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar conexão ao iniciar
transporter.verify((error, success) => {
  if (error) {
    logger.error('❌ Erro na conexão SMTP:', error.message);
  } else {
    logger.info('✅ Conexão SMTP OK');
  }
});

export const EmailService = {
  /**
   * Enviar email genérico
   */
  async send(options: EmailOptions) {
    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@leidycleaner.com.br',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
      });

      logger.info(`✅ Email enviado para ${options.to}`);
      return result;
    } catch (error) {
      logger.error(`❌ Erro ao enviar email para ${options.to}:`, error);
      throw error;
    }
  },

  /**
   * Email de boas-vindas (registro)
   */
  async sendWelcome(email: string, name: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Bem-vindo à Leidy Cleaner! 🎉</h2>
        <p>Olá ${name},</p>
        <p>Sua conta foi criada com sucesso. Agora você pode agendar serviços de limpeza profissional.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/services" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Serviços
          </a>
        </div>
        <p>Se tiver perguntas, nossa equipe está pronta para ajudar!</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Bem-vindo à Leidy Cleaner!',
      html,
    });
  },

  /**
   * Email de confirmação de agendamento
   */
  async sendBookingConfirmation({
    customerName,
    customerEmail,
    bookingId,
    serviceName,
    scheduledDate,
    address,
    totalPrice,
    notes,
  }: BookingConfirmation) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Agendamento Confirmado ✅</h2>
        <p>Olá ${customerName},</p>
        <p>Seu agendamento foi criado com sucesso!</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Serviço:</strong> ${serviceName}</p>
          <p><strong>Data/Hora:</strong> ${new Date(scheduledDate).toLocaleString('pt-BR')}</p>
          <p><strong>Endereço:</strong> ${address}</p>
          <p><strong>Valor Total:</strong> R$ ${totalPrice.toFixed(2)}</p>
          ${notes ? `<p><strong>Observações:</strong> ${notes}</p>` : ''}
          <p><strong>ID do Agendamento:</strong> #${bookingId}</p>
        </div>

        <h3>Próximo Passo</h3>
        <p>Complete o pagamento para confirmar seu agendamento.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/bookings/${bookingId}" 
             style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ir para Pagamento
          </a>
        </div>

        <p>Obrigado por escolher a Leidy Cleaner!</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: customerEmail,
      subject: `Agendamento Confirmado - ${serviceName}`,
      html,
    });
  },

  /**
   * Email de recibo de pagamento
   */
  async sendPaymentReceipt({
    email,
    transactionId,
    amount,
    method,
    date,
    bookingId,
    serviceName,
  }: PaymentReceipt) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Pagamento Recebido 💳</h2>
        <p>Obrigado pelo pagamento!</p>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Status:</strong> <span style="color: #4CAF50;">✅ PAGAMENTO CONFIRMADO</span></p>
          <p><strong>Serviço:</strong> ${serviceName}</p>
          <p><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>
          <p><strong>Método:</strong> ${method}</p>
          <p><strong>Data:</strong> ${new Date(date).toLocaleString('pt-BR')}</p>
          <p><strong>ID da Transação:</strong> ${transactionId}</p>
          <p><strong>Agendamento:</strong> #${bookingId}</p>
        </div>

        <h3>Próximas Etapas</h3>
        <ul>
          <li>Seu agendamento foi confirmado</li>
          <li>A equipe fará contato 24h antes do serviço</li>
          <li>Tenha um local acessível para a equipe</li>
        </ul>

        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/bookings/${bookingId}" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Acompanhar Agendamento
          </a>
        </div>

        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Recibo de Pagamento - R$ ${amount.toFixed(2)}`,
      html,
    });
  },

  /**
   * Email de cancelamento de agendamento
   */
  async sendBookingCancelled(email: string, bookingId: string, serviceName: string, reason?: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Agendamento Cancelado</h2>
        <p>Seu agendamento foi cancelado.</p>
        
        <div style="background-color: #fef3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Serviço:</strong> ${serviceName}</p>
          <p><strong>ID do Agendamento:</strong> #${bookingId}</p>
          ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        </div>

        <p>Se houve pagamento, você receberá o reembolso em até 5 dias úteis.</p>
        <p>Deseja agendar outro serviço?</p>

        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/services" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Serviços
          </a>
        </div>

        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Agendamento Cancelado - ${serviceName}`,
      html,
    });
  },

  /**
   * Email de notificação ao staff
   */
  async notifyStaffNewBooking(staffEmail: string, staffName: string, bookingDetails: any) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Novo Agendamento Atribuído ✨</h2>
        <p>Olá ${staffName},</p>
        <p>Você foi atribuído a um novo agendamento!</p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Serviço:</strong> ${bookingDetails.serviceName}</p>
          <p><strong>Cliente:</strong> ${bookingDetails.customerName}</p>
          <p><strong>Contato:</strong> ${bookingDetails.customerPhone}</p>
          <p><strong>Data/Hora:</strong> ${new Date(bookingDetails.scheduledDate).toLocaleString('pt-BR')}</p>
          <p><strong>Endereço:</strong> ${bookingDetails.address}</p>
          <p><strong>Notas:</strong> ${bookingDetails.notes || 'Nenhuma'}</p>
        </div>

        <p>Acesse seu dashboard para mais detalhes e atualizações.</p>

        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: staffEmail,
      subject: `Novo Agendamento - ${bookingDetails.serviceName}`,
      html,
    });
  },

  /**
   * Email de reset de password
   */
  async sendPasswordResetLink(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Redefinir Senha</h2>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no link abaixo para continuar:</p>
        
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Redefinir Senha
          </a>
        </div>

        <p style="color: #666; font-size: 12px;">
          Este link expira em 1 hora. Se não solicitou isso, ignore este email.
        </p>

        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Redefinir sua Senha - Leidy Cleaner',
      html,
    });
  },

  /**
   * Email de avaliação pendente
   */
  async sendReviewReminder(email: string, customerName: string, bookingDetails: any) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Nos Avalie! ⭐</h2>
        <p>Olá ${customerName},</p>
        <p>Seu serviço de limpeza foi concluído. Queremos saber sua opinião!</p>
        
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Serviço:</strong> ${bookingDetails.serviceName}</p>
          <p><strong>Data:</strong> ${new Date(bookingDetails.scheduledDate).toLocaleString('pt-BR')}</p>
        </div>

        <p>Sua avaliação nos ajuda a melhorar continuamente!</p>

        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/bookings/${bookingDetails.bookingId}#review" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Deixar Avaliação
          </a>
        </div>

        <hr />
        <p style="color: #666; font-size: 12px;">
          © 2026 Leidy Cleaner. Todos os direitos reservados.
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Avalie seu Serviço - ${bookingDetails.serviceName}`,
      html,
    });
  },
};

export default EmailService;
