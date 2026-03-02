import Stripe from 'stripe';
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
export declare const StripeService: {
    /**
     * Criar session de checkout no Stripe
     */
    createCheckoutSession({ bookingId, userId, amount, serviceName, customerEmail, successUrl, cancelUrl, }: CreateCheckoutSessionParams): Promise<{
        sessionId: string;
        url: string | null;
        amount: number;
    }>;
    /**
     * Validar webhook do Stripe
     */
    validateWebhookSignature(body: string, signature: string): WebhookEvent | null;
    /**
     * Processar webhook de pagamento completo
     */
    handleCheckoutSessionCompleted(sessionId: string): Promise<{
        bookingId: string | null;
        paymentStatus: string;
        amount: number;
        stripeSessionId: string;
        chargeId: string | Stripe.PaymentIntent | null;
    } | null>;
    /**
     * Reembolsar pagamento
     */
    refundPayment(chargeId: string, reason?: string): Promise<{
        refundId: string;
        status: string | null;
        amount: number;
    }>;
    /**
     * Criar subscription (para planos recorrentes)
     */
    createSubscription(customerId: string, priceId: string): Promise<Stripe.Response<Stripe.Subscription>>;
    /**
     * Cancelar subscription
     */
    cancelSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>>;
    /**
     * Listar transações de um cliente
     */
    getCustomerTransactions(customerId: string, limit?: number): Promise<{
        id: string;
        amount: number;
        currency: string;
        status: Stripe.Charge.Status;
        description: string | null;
        created: Date;
    }[]>;
    /**
     * Obter dashboard stats do Stripe
     */
    getDashboardStats(): Promise<{
        totalCustomers: number;
        totalRevenue: number;
        successfulTransactions: number;
        failedTransactions: number;
    }>;
};
export default StripeService;
//# sourceMappingURL=StripeService.d.ts.map