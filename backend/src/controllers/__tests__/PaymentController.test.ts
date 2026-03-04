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
