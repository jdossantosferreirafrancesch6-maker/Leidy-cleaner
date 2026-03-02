# API Documentation

The backend exposes a RESTful API under `/api/v1`.

## Authentication

- `POST /api/v1/auth/register`
  - body: `{ email, password, name }`
  - returns `user` and tokens

- `POST /api/v1/auth/login`
  - body: `{ email, password }`
  - returns `accessToken` and `refreshToken`

- `POST /api/v1/auth/refresh`
  - body: `{ refreshToken }`
  - returns new tokens

- `GET /api/v1/auth/me`
  - header: `Authorization: Bearer <token>`
  - returns current user

## Services

- `GET /api/v1/services`
  - list all active services

## Bookings

- `POST /api/v1/bookings`
  - body: `{ serviceId, bookingDate, address, notes? }`
  - requires auth
  - returns booking

- `GET /api/v1/bookings/:id`
- `PUT /api/v1/bookings/:id/status`
- `DELETE /api/v1/bookings/:id`

## Payments

- `POST /api/v1/payments` (PIX)
  - body: `{ bookingId }`
  - marks as paid

- `POST /api/v1/payments/checkout` (Stripe fallback)
- `POST /api/v1/payments/webhook` (Stripe webhook)

## Analytics (admin only)

- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/analytics/metrics?startDate=&endDate=`
- `GET /api/v1/analytics/staff-performance`
- `GET /api/v1/analytics/export/bookings?startDate=&endDate=`

(see `src/controllers/AnalyticsController.ts` for details)
