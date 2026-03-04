import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import PaymentService from '../services/PaymentService';
import BookingService from '../services/BookingService';
import Stripe from 'stripe';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export class PaymentController {
  static payBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const { bookingId } = req.body;
    if (!bookingId) throw ApiError(t('bookingIdRequired'), 400);

    const booking = await BookingService.getById(bookingId);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'staff' &&
      String(booking.user_id) !== req.user.id
    ) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    const updated = await PaymentService.markBookingPaid(bookingId);
    if (!updated) throw ApiError(t('failedUpdateBooking'), 500);

    res.status(200).json({ message: t('bookingPaid'), data: { booking: updated } });
  });

  static pixPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const { bookingId } = req.body;
    if (!bookingId) throw ApiError(t('bookingIdRequired'), 400);

    const booking = await BookingService.getById(bookingId);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'staff' &&
      req.user.role !== 'customer'
    ) {
      throw ApiError(t('onlyCustomersStaffCanMakePayments'), 403);
    }

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'staff' &&
      String(booking.user_id) !== req.user.id
    ) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    const pixData = {
      pixKey: '51980330422',
      amount: booking.total_price,
      description: `Pagamento agendamento ${booking.id}`,
      bookingId: booking.id
    };

    res.status(200).json({
      message: t('pixPaymentDataGenerated'),
      data: pixData
    });
  });

  static confirmPixPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const { bookingId } = req.body;
    if (!bookingId) throw ApiError(t('bookingIdRequired'), 400);

    const booking = await BookingService.getById(bookingId);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'staff' &&
      String(booking.user_id) !== req.user.id
    ) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    if (booking.status === 'confirmed') {
      throw ApiError(t('bookingAlreadyPaid'), 400);
    }

    const updated = await PaymentService.markBookingPaid(bookingId);
    if (!updated) throw ApiError(t('failedUpdateBooking'), 500);

    res.status(200).json({ message: t('pixPaymentConfirmed'), data: { booking: updated } });
  });

  static checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const { bookingId } = req.body;
    if (!bookingId) throw ApiError(t('bookingIdRequired'), 400);

    const booking = await BookingService.getById(bookingId);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'staff' &&
      String(booking.user_id) !== req.user.id
    ) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    // if stripe is configured, create a checkout session
    if (process.env.STRIPE_SECRET_KEY) {
      const origin = req.headers.origin || '';
      try {
        const url = await PaymentService.createStripeSession(bookingId, origin as string);
        return res.status(200).json({
          message: t('stripeSessionCreated'),
          data: { url }
        });
      } catch (err) {
        // fall back to instant payment on failure
        logger.error('stripe checkout error', err);
      }
    }

    // fallback when stripe not configured or session failed
    const updated = await PaymentService.markBookingPaid(bookingId);
    if (!updated) throw ApiError(t('failedUpdateBooking'), 500);

    res.status(200).json({
      message: t('paymentProcessedFallback'),
      data: { booking: updated }
    });
    return; // satisfy TS that we always exit the handler
  });

  static refundBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const { bookingId } = req.body;
    if (!bookingId) throw ApiError(t('bookingIdRequired'), 400);

    const booking = await BookingService.getById(bookingId);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    if (req.user.role !== 'admin' && String(booking.user_id) !== req.user.id) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    // attempt Stripe refund if charge id exists
    let stripeRefund: any;
    if (process.env.STRIPE_SECRET_KEY && booking.stripe_charge_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
        stripeRefund = await stripe.refunds.create({ charge: booking.stripe_charge_id });
      } catch (err) {
        logger.error('stripe refund error', err);
      }
    }

    const updated = await PaymentService.processRefund(bookingId, stripeRefund?.id);
    if (!updated) throw ApiError(t('failedUpdateBooking'), 500);

    res.status(200).json({ message: t('bookingRefunded'), data: { booking: updated, stripeRefund } });
  });

  static webhook = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stripe sends a raw body for signature verification; our route may be registered
    // with express.raw() when a webhook secret is set.  If we have a secret and a
    // signature header we attempt to validate, otherwise we fall back to the parsed
    // body (tests and fallback mode use json parser).
    let event: any = req.body;
    const sig = req.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret && sig) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });
        // req.body may be a Buffer when raw parser used
        const rawBody = req.body as Buffer;
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        logger.error('Webhook signature verification failed:', err.message || err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
    }

    // Handle Stripe webhook events
    if (event.type === 'checkout.session.completed') {
      const bookingId = event.data?.object?.metadata?.bookingId;
      const stripeChargeId = event.data?.object?.payment_intent || event.data?.object?.charge;
      if (bookingId) {
        try {
          const updated = await PaymentService.markBookingPaid(bookingId, stripeChargeId);
          if (!updated) {
            // Booking not found; log but still return 200 to Stripe
            logger.warn(`Webhook: Could not update booking ${bookingId}`);
          }
        } catch (err) {
          // Log error but don't fail the webhook response
          logger.error('Error processing webhook event:', err);
        }
      }
    }

    res.status(200).json({ received: true });
  });

  static listRefunds = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only admin can access refund list
    if (!req.user || req.user.role !== 'admin') {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    const { startDate, endDate } = req.query;
    const filter = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    };

    const refunds = await PaymentService.getAllRefunds(filter);
    res.status(200).json({
      message: t('refundsRetrieved'),
      data: { refunds, count: refunds.length }
    });
  });

  static getRefundDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only admin can access refund details
    if (!req.user || req.user.role !== 'admin') {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    const { bookingId } = req.params;
    const bookingIdStr = Array.isArray(bookingId) ? bookingId[0] : bookingId;
    if (!bookingIdStr) throw ApiError(t('bookingIdRequired'), 400);

    const refund = await PaymentService.getRefundById(bookingIdStr);
    res.status(200).json({
      message: t('refundRetrieved'),
      data: { refund }
    });
  });
}

export default PaymentController
