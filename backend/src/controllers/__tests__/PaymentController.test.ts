import PaymentController from '../PaymentController';
import Stripe from 'stripe';

jest.mock('stripe');

describe('PaymentController webhook handling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // ensure booking update always succeeds so we can focus on signature logic
    jest.spyOn(require('../../services/PaymentService').default, 'markBookingPaid').mockResolvedValue({ id: 'abc' } as any);
  });

  it('verifies signature when webhook secret is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const constructMock = jest.fn().mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: { bookingId: 'abc' } } }
    });
    // stripe() returns an object that has webhooks.constructEvent
    // stripe is a class; we need to convince TS it's mockable
    ((Stripe as unknown) as jest.Mock).mockImplementation(() => ({
      webhooks: { constructEvent: constructMock },
      checkout: { sessions: { create: jest.fn() } }
    }));

    const req: any = {
      body: Buffer.from(JSON.stringify({ foo: 'bar' })),
      headers: { 'stripe-signature': 'sig' }
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json, send: jest.fn() });
    const res: any = { status };
    const next = jest.fn();

    // call the wrapped handler
    await PaymentController.webhook(req, res, next);

    expect(constructMock).toHaveBeenCalledWith(req.body, 'sig', process.env.STRIPE_WEBHOOK_SECRET);
    expect(status).toHaveBeenCalledWith(200);
  });

  it('skips verification when no secret', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req: any = { body: { type: 'checkout.session.completed', data: { object: { metadata: { bookingId: 'abc' } } } }, headers: {} };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };

    await PaymentController.webhook(req, res, jest.fn());
    expect(status).toHaveBeenCalledWith(200);
  });
});

// tests for refund endpoint

describe('PaymentController refund flow', () => {
  let bookingMock: any;
  beforeEach(() => {
    jest.resetAllMocks();
    bookingMock = { id: 'abc', user_id: 'u1', stripe_charge_id: 'ch_123' };
    // spy on the default export directly to avoid module resolution issues
    const BookingSvc = require('../../services/BookingService').default;
    jest.spyOn(BookingSvc, 'getById').mockResolvedValue(bookingMock as any);
    jest.spyOn(require('../../services/PaymentService').default, 'processRefund').mockResolvedValue({ id: 'abc', payment_status: 'refunded' } as any);
  });

  it('returns 401 when not authenticated by calling next', async () => {
    const req: any = { body: { bookingId: 'abc' } };
    const next = jest.fn();
    await PaymentController.refundBooking(req, {} as any, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(401);
  });

  it('calls next with error when bookingId missing', async () => {
    const req: any = { body: {}, user: { id: 'u1', role: 'customer' } };
    const next = jest.fn();
    await PaymentController.refundBooking(req, {} as any, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
  });

  it('calls next with error if user not owner or admin', async () => {
    const req: any = { body: { bookingId: 'abc' }, user: { id: 'other', role: 'customer' } };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };
    const next = jest.fn();
    await PaymentController.refundBooking(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(403);
  });

  it('processes refund and invokes service', async () => {
    const req: any = { body: { bookingId: 'abc' }, user: { id: 'u1', role: 'customer' } };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };

    // stub Stripe and refund method
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    const refundMock = jest.fn().mockResolvedValue({ id: 're_123' });
    ((Stripe as unknown) as jest.Mock).mockImplementation(() => ({ refunds: { create: refundMock } }));

    // avoid touching DB by stubbing the service
    const processSpy = jest
      .spyOn(require('../../services/PaymentService').default, 'processRefund')
      .mockResolvedValue(bookingMock as any);

    const next = jest.fn();
    await PaymentController.refundBooking(req, res, next);
    expect(refundMock).toHaveBeenCalledWith({ charge: bookingMock.stripe_charge_id });
    expect(processSpy).toHaveBeenCalledWith('abc', 're_123');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { booking: expect.any(Object), stripeRefund: expect.any(Object) } }));
  });
});
