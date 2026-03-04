# Documentação da API

O backend expõe uma API RESTful em `/api/v1`.

*This file is primarily in Portuguese; English equivalents are provided in parentheses for reference.*

## Autenticação (Authentication)

- `POST /api/v1/auth/register`
  - corpo (body): `{ email, password, name }`
  - retorna `user` e tokens

- `POST /api/v1/auth/login`
  - corpo: `{ email, password }`
  - retorna `accessToken` e `refreshToken`

- `POST /api/v1/auth/refresh`
  - corpo: `{ refreshToken }`
  - retorna novos tokens

- `GET /api/v1/auth/me`
  - cabeçalho (header): `Authorization: Bearer <token>`
  - retorna o usuário atual

## Serviços (Services)

- `GET /api/v1/services`
  - lista todos os serviços ativos

## Agendamentos (Bookings)

- `POST /api/v1/bookings`
  - corpo: `{ serviceId, bookingDate, address, notes? }`
  - requer autenticação
  - retorna o agendamento

- `GET /api/v1/bookings/:id` (obter agendamento por ID)
- `PUT /api/v1/bookings/:id/status` (atualizar status)
- `DELETE /api/v1/bookings/:id` (excluir agendamento)

## Pagamentos (Payments)

- `POST /api/v1/payments` (PIX)
  - corpo: `{ bookingId }`
  - marca o agendamento como pago

- `POST /api/v1/payments/checkout` (fallback Stripe)
  - corpo: `{ bookingId }` – cria sessão Stripe ou paga imediatamente

- `POST /api/v1/payments/refund` (refund endpoint)
  - corpo: `{ bookingId }`
  - apenas admin ou proprietário do agendamento pode solicitar
  - tenta reembolsar via Stripe se `stripe_charge_id` estiver presente e a chave configurada
  - marca o agendamento como `refunded` no banco de dados

- `POST /api/v1/payments/webhook` (webhook Stripe)

## Analytics (somente admin)

- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/analytics/metrics?startDate=&endDate=`
- `GET /api/v1/analytics/staff-performance`
- `GET /api/v1/analytics/export/bookings?startDate=&endDate=`

(consulte `src/controllers/AnalyticsController.ts` para detalhes)
