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
export declare const EmailService: {
    /**
     * Enviar email genérico
     */
    send(options: EmailOptions): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de boas-vindas (registro)
     */
    sendWelcome(email: string, name: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de confirmação de agendamento
     */
    sendBookingConfirmation({ customerName, customerEmail, bookingId, serviceName, scheduledDate, address, totalPrice, notes, }: BookingConfirmation): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de recibo de pagamento
     */
    sendPaymentReceipt({ email, transactionId, amount, method, date, bookingId, serviceName, }: PaymentReceipt): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de cancelamento de agendamento
     */
    sendBookingCancelled(email: string, bookingId: string, serviceName: string, reason?: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de notificação ao staff
     */
    notifyStaffNewBooking(staffEmail: string, staffName: string, bookingDetails: any): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de reset de password
     */
    sendPasswordResetLink(email: string, resetToken: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    /**
     * Email de avaliação pendente
     */
    sendReviewReminder(email: string, customerName: string, bookingDetails: any): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
};
export default EmailService;
//# sourceMappingURL=EmailService.d.ts.map