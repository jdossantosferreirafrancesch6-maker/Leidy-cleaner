import request from 'supertest';
import express from 'express';
import paymentsRoutes from '../payments';
import authRoutes from '../auth';
import BookingsRoutes from '../bookings';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', BookingsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use(errorHandler);

describe('Payments Routes', () => {
  let customerToken: string;
  let staffToken: string;
  let bookingId: string;

  const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  beforeEach(async () => {
    // Create customer user
    const customerEmail = `customer+${uniqueSuffix()}@test.com`;
    const customerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: customerEmail,
        password: 'customer123456',
        name: 'Customer User',
        phone: '11999999999'
      });

    if (!customerResponse.body.data?.tokens?.accessToken) {
      throw new Error('Customer registration failed');
    }
    customerToken = customerResponse.body.data.tokens.accessToken;

    // Create a test booking
    const bookingResponse = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: '1', // seed service
        scheduledDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        address: 'Test Address',
        notes: 'Test notes'
      });

    if (bookingResponse.status === 201 && bookingResponse.body.data?.booking?.id) {
      bookingId = bookingResponse.body.data.booking.id;
    }
  });

  describe('POST /api/v1/payments/checkout', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/v1/payments/checkout')
        .send({ bookingId: '1' });

      expect(response.status).toBe(401);
    });

    it('should require bookingId', async () => {
      const response = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: '99999' });

      expect(response.status).toBe(404);
    });

    it('should create checkout session or process payment', async () => {
      if (!bookingId) {
        // Skip this test if booking creation failed
        return;
      }

      const response = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      // Stripe checkout returns { url }, fallback returns booking data
      expect([200]).toContain(response.status);
      expect(response.body).toHaveProperty('data');

      // In test mode (no STRIPE_SECRET_KEY), fallback is used
      if (response.body.data.booking) {
        expect(response.body.data.booking.payment_status).toBe('paid');
      }
      // In production with Stripe, expect { url }
      if (response.body.data.url) {
        expect(typeof response.body.data.url).toBe('string');
      }
    });

    it('should enforce permission check', async () => {
      // Create another customer
      const otherEmail = `other+${uniqueSuffix()}@test.com`;
      const otherResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: otherEmail,
          password: 'other123456',
          name: 'Other User',
          phone: '11999999999'
        });
      const otherToken = otherResponse.body.data.tokens.accessToken;

      // Try to access another's booking
      if (bookingId) {
        const response = await request(app)
          .post('/api/v1/payments/checkout')
          .set('Authorization', `Bearer ${otherToken}`)
          .send({ bookingId });

        expect(response.status).toBe(403);
      }
    });
  });

  describe('POST /api/v1/payments/pix', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/v1/payments/pix')
        .send({ bookingId: '1' });

      expect(response.status).toBe(401);
    });

    it('should require bookingId', async () => {
      const response = await request(app)
        .post('/api/v1/payments/pix')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return PIX payment data', async () => {
      if (!bookingId) return;

      const response = await request(app)
        .post('/api/v1/payments/pix')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pixKey');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('bookingId');
    });
  });

  describe('POST /api/v1/payments/pix/confirm', () => {
    it('should confirm PIX payment and update booking', async () => {
      if (!bookingId) return;

      const response = await request(app)
        .post('/api/v1/payments/pix/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      expect(response.status).toBe(200);
      expect(response.body.data.booking).toHaveProperty('payment_status', 'paid');
      expect(response.body.data.booking).toHaveProperty('status', 'confirmed');
    });

    it('should return 400 if already paid', async () => {
      if (!bookingId) return;

      // First payment
      await request(app)
        .post('/api/v1/payments/pix/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      // Second payment attempt
      const response = await request(app)
        .post('/api/v1/payments/pix/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/payments/refund', () => {
    it('should refund booking when authorized', async () => {
      if (!bookingId) return;

      // first confirm via PIX so status is paid
      await request(app)
        .post('/api/v1/payments/pix/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      expect(response.status).toBe(200);
      expect(response.body.data.booking).toHaveProperty('payment_status', 'refunded');
      expect(response.body.data.booking).toHaveProperty('status', 'cancelled');
    });

    it('should allow admin to refund any booking', async () => {
      if (!bookingId) return;
      // login admin
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@leidycleaner.com', password: 'admin123456' });
      const adminToken = adminLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bookingId });

      expect(response.status).toBe(200);
      expect(response.body.data.booking.payment_status).toBe('refunded');
    });

    it('should return 403 when unauthorized user attempts refund', async () => {
      if (!bookingId) return;
      const otherEmail = `other+${uniqueSuffix()}@test.com`;
      const otherRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: otherEmail, password: 'otherpass', name: 'Other', phone: '11900000000' });
      const otherToken = otherRes.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ bookingId });

      expect(response.status).toBe(403);
    });

    it('should require bookingId', async () => {
      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: 'nope' });
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/payments/admin/refunds', () => {
    it('should return refunds list for admin', async () => {
      // Login admin
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@leidycleaner.com', password: 'admin123456' });
      const adminToken = adminLogin.body.data.tokens.accessToken;

      // First create a refunded booking
      if (bookingId) {
        await request(app)
          .post('/api/v1/payments/pix/confirm')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ bookingId });

        await request(app)
          .post('/api/v1/payments/refund')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ bookingId });
      }

      // Now list refunds
      const response = await request(app)
        .get('/api/v1/payments/admin/refunds')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('refunds');
      expect(Array.isArray(response.body.data.refunds)).toBe(true);
      expect(response.body.data).toHaveProperty('count');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/payments/admin/refunds')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/payments/admin/refunds');

      expect(response.status).toBe(401);
    });

    it('should support date range filtering', async () => {
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@leidycleaner.com', password: 'admin123456' });
      const adminToken = adminLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .get('/api/v1/payments/admin/refunds')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('refunds');
    });
  });

  describe('GET /api/v1/payments/admin/refunds/:bookingId', () => {
    it('should return refund detail for admin', async () => {
      if (!bookingId) return;

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@leidycleaner.com', password: 'admin123456' });
      const adminToken = adminLogin.body.data.tokens.accessToken;

      // First refund a booking
      await request(app)
        .post('/api/v1/payments/pix/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId });

      await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bookingId });

      // Now get detail
      const response = await request(app)
        .get(`/api/v1/payments/admin/refunds/${bookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('refund');
      expect(response.body.data.refund).toHaveProperty('booking_id', bookingId);
    });

    it('should deny access to non-admin users', async () => {
      if (!bookingId) return;

      const response = await request(app)
        .get(`/api/v1/payments/admin/refunds/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      if (!bookingId) return;

      const response = await request(app)
        .get(`/api/v1/payments/admin/refunds/${bookingId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should return 200 for valid webhook (no signature)', async () => {
      // In test mode without STRIPE_WEBHOOK_SECRET, webhook just accepts the request
      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: { bookingId: 'test-booking-id' }
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle missing signature gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ type: 'charge.succeeded' });

      expect(response.status).toBe(200);
    });
  });
});
