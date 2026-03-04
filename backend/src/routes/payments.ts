import { Router } from 'express';
import express from 'express';
import PaymentController from '../controllers/PaymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, PaymentController.payBooking);
router.post('/pix', authenticateToken, PaymentController.pixPayment);
router.post('/pix/confirm', authenticateToken, PaymentController.confirmPixPayment);
router.post('/checkout', authenticateToken, PaymentController.checkout);
router.post('/refund', authenticateToken, PaymentController.refundBooking);

// webhooks need raw body parsing when Stripe secret is configured so we can verify
// the signature.  In test environments the secret is unset, so the normal JSON
// parser is sufficient and the handler will just read req.body.
if (process.env.STRIPE_WEBHOOK_SECRET) {
  router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);
} else {
  router.post('/webhook', PaymentController.webhook);
}

// Admin refund management endpoints
router.get('/admin/refunds', authenticateToken, PaymentController.listRefunds);
router.get('/admin/refunds/:bookingId', authenticateToken, PaymentController.getRefundDetail);

export default router;
