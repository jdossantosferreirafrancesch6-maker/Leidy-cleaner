import Stripe from 'stripe';
import { logger } from '../utils/logger-advanced';

/**
 * Serviço de integração com Stripe para pagamentos
 * Suporta: Checkout, Webhooks, Refunds, Subscriptions
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

interface CreateCheckoutSessionParams {
  bookingId: string;
  userId: string;
  amount: number;
  serviceName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export const StripeService = {
  /**
   * Criar session de checkout no Stripe
   */
  async createCheckoutSession({
    bookingId,
    userId,
    amount,
    serviceName,
    customerEmail,
    successUrl,
    cancelUrl,
  }: CreateCheckoutSessionParams) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        client_reference_id: bookingId,
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: serviceName,
                description: `Agendamento #${bookingId}`,
              },
              unit_amount: Math.round(amount * 100), // Converter para centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          bookingId,
          userId,
        },
      });

      logger.info(`✅ Stripe session criada: ${session.id}`);
      return {
        sessionId: session.id,
        url: session.url,
        amount,
      };
    } catch (error) {
      logger.error('❌ Erro ao criar Stripe session:', error);
      throw error;
    }
  },

  /**
   * Validar webhook do Stripe
   */
  validateWebhookSignature(body: string, signature: string): WebhookEvent | null {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      return event as WebhookEvent;
    } catch (error) {
      logger.error('❌ Erro ao validar webhook:', error);
      return null;
    }
  },

  /**
   * Processar webhook de pagamento completo
   */
  async handleCheckoutSessionCompleted(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        logger.info(`✅ Pagamento confirmado: ${session.client_reference_id}`);
        return {
          bookingId: session.client_reference_id,
          paymentStatus: 'paid',
          amount: session.amount_total ? session.amount_total / 100 : 0,
          stripeSessionId: sessionId,
          chargeId: session.payment_intent,
        };
      }

      return null;
    } catch (error) {
      logger.error('❌ Erro ao processar webhook:', error);
      throw error;
    }
  },

  /**
   * Reembolsar pagamento
   */
  async refundPayment(chargeId: string, reason: string = 'requested_by_customer') {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId,
        reason: reason as any,
      });

      logger.info(`✅ Reembolso processado: ${refund.id}`);
      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      logger.error('❌ Erro ao reembolsar:', error);
      throw error;
    }
  },

  /**
   * Criar subscription (para planos recorrentes)
   */
  async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      logger.info(`✅ Subscription criada: ${subscription.id}`);
      return subscription;
    } catch (error) {
      logger.error('❌ Erro ao criar subscription:', error);
      throw error;
    }
  },

  /**
   * Cancelar subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.del(subscriptionId);
      logger.info(`✅ Subscription cancelada: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('❌ Erro ao cancelar subscription:', error);
      throw error;
    }
  },

  /**
   * Listar transações de um cliente
   */
  async getCustomerTransactions(customerId: string, limit: number = 20) {
    try {
      const charges = await stripe.charges.list({
        customer: customerId,
        limit,
      });

      return charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        description: charge.description,
        created: new Date(charge.created * 1000),
      }));
    } catch (error) {
      logger.error('❌ Erro ao listar transações:', error);
      return [];
    }
  },

  /**
   * Obter dashboard stats do Stripe
   */
  async getDashboardStats() {
    try {
      const charges = await stripe.charges.list({ limit: 100 });
      const customers = await stripe.customers.list({ limit: 100 });

      const totalRevenue = charges.data.reduce((sum, charge) => {
        if (charge.status === 'succeeded') return sum + charge.amount;
        return sum;
      }, 0) / 100;

      return {
        totalCustomers: customers.data.length,
        totalRevenue,
        successfulTransactions: charges.data.filter((c) => c.status === 'succeeded').length,
        failedTransactions: charges.data.filter((c) => c.status === 'failed').length,
      };
    } catch (error) {
      logger.error('❌ Erro ao obter stats:', error);
      return { totalCustomers: 0, totalRevenue: 0, successfulTransactions: 0, failedTransactions: 0 };
    }
  },
};

export default StripeService;
