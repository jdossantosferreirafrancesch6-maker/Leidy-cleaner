"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const logger_advanced_1 = require("../utils/logger-advanced");
/**
 * Serviço de integração com Stripe para pagamentos
 * Suporta: Checkout, Webhooks, Refunds, Subscriptions
 */
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-11-15',
});
exports.StripeService = {
    /**
     * Criar session de checkout no Stripe
     */
    async createCheckoutSession({ bookingId, userId, amount, serviceName, customerEmail, successUrl, cancelUrl, }) {
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
            logger_advanced_1.logger.info(`✅ Stripe session criada: ${session.id}`);
            return {
                sessionId: session.id,
                url: session.url,
                amount,
            };
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao criar Stripe session:', error);
            throw error;
        }
    },
    /**
     * Validar webhook do Stripe
     */
    validateWebhookSignature(body, signature) {
        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
            const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
            return event;
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao validar webhook:', error);
            return null;
        }
    },
    /**
     * Processar webhook de pagamento completo
     */
    async handleCheckoutSessionCompleted(sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === 'paid') {
                logger_advanced_1.logger.info(`✅ Pagamento confirmado: ${session.client_reference_id}`);
                return {
                    bookingId: session.client_reference_id,
                    paymentStatus: 'paid',
                    amount: session.amount_total ? session.amount_total / 100 : 0,
                    stripeSessionId: sessionId,
                    chargeId: session.payment_intent,
                };
            }
            return null;
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao processar webhook:', error);
            throw error;
        }
    },
    /**
     * Reembolsar pagamento
     */
    async refundPayment(chargeId, reason = 'requested_by_customer') {
        try {
            const refund = await stripe.refunds.create({
                charge: chargeId,
                reason: reason,
            });
            logger_advanced_1.logger.info(`✅ Reembolso processado: ${refund.id}`);
            return {
                refundId: refund.id,
                status: refund.status,
                amount: refund.amount / 100,
            };
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao reembolsar:', error);
            throw error;
        }
    },
    /**
     * Criar subscription (para planos recorrentes)
     */
    async createSubscription(customerId, priceId) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
            });
            logger_advanced_1.logger.info(`✅ Subscription criada: ${subscription.id}`);
            return subscription;
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao criar subscription:', error);
            throw error;
        }
    },
    /**
     * Cancelar subscription
     */
    async cancelSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.del(subscriptionId);
            logger_advanced_1.logger.info(`✅ Subscription cancelada: ${subscriptionId}`);
            return subscription;
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao cancelar subscription:', error);
            throw error;
        }
    },
    /**
     * Listar transações de um cliente
     */
    async getCustomerTransactions(customerId, limit = 20) {
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
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao listar transações:', error);
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
                if (charge.status === 'succeeded')
                    return sum + charge.amount;
                return sum;
            }, 0) / 100;
            return {
                totalCustomers: customers.data.length,
                totalRevenue,
                successfulTransactions: charges.data.filter((c) => c.status === 'succeeded').length,
                failedTransactions: charges.data.filter((c) => c.status === 'failed').length,
            };
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao obter stats:', error);
            return { totalCustomers: 0, totalRevenue: 0, successfulTransactions: 0, failedTransactions: 0 };
        }
    },
};
exports.default = exports.StripeService;
//# sourceMappingURL=StripeService.js.map