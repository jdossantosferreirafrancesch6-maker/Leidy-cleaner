class SessionCreateMock {
  create = jest.fn().mockResolvedValue({ url: 'https://stripe.checkout/session' });
}

class CheckoutMock {
  sessions = new SessionCreateMock();
}

export default jest.fn().mockImplementation(() => ({
  checkout: new CheckoutMock(),
}));
