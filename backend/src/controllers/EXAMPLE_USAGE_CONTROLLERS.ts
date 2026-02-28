/**
 * API Controllers para integração com os serviços
 * Exemplos de como usar: EmailService, StaffService, TwoFactorService, etc
 */

// ============= EXEMPLO 1: BOOKING CONTROLLER COM EMAIL =============

import { Router, Request, Response } from 'express';
import BookingService from '../services/BookingService';
import EmailService from '../services/EmailService';
import StaffService from '../services/StaffService';
import AnalyticsService from '../services/AnalyticsService';

const bookingRouter = Router();

/**
 * POST /api/v1/bookings
 * Criar novo agendamento + enviar email
 */
bookingRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { serviceId, scheduledDate, address, notes, customerId } = req.body;

    // Criar agendamento
    const booking = await BookingService.create({
      serviceId,
      scheduledDate,
      address,
      notes,
      customerId,
    });

    // Buscar detalhes do cliente e serviço
    const customer = await BookingService.getCustomer(customerId);
    const service = await BookingService.getService(serviceId);

    // Enviar email de confirmação
    await EmailService.sendBookingConfirmation({
      customerName: customer.name,
      customerEmail: customer.email,
      bookingId: booking.id,
      serviceName: service.name,
      scheduledDate: booking.scheduled_date,
      address: booking.address,
      totalPrice: booking.total_price,
      notes,
    });

    // Rastrear evento no Analytics
    await AnalyticsService.trackEvent(customerId, 'booking_created', {
      booking_id: booking.id,
      service_id: serviceId,
      total_price: booking.total_price,
    });

    res.status(201).json({
      success: true,
      booking,
      message: 'Agendamento criado! Verifique seu email para confirmação.',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/bookings/:id
 */
bookingRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await BookingService.getById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/bookings/:id/status
 * Atualizar status do agendamento
 */
bookingRouter.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const booking = await BookingService.updateStatus(req.params.id, status);

    // Se completado, sugerir review
    if (status === 'completed') {
      const customer = await BookingService.getCustomer(booking.customer_id);
      const service = await BookingService.getService(booking.service_id);

      await EmailService.sendReviewReminder(
        customer.email,
        customer.name,
        {
          serviceName: service.name,
          bookingId: booking.id,
          scheduledDate: booking.scheduled_date,
        }
      );
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/bookings/:id
 * Cancelar agendamento + reembolso + email
 */
bookingRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await BookingService.getById(req.params.id);
    const customer = await BookingService.getCustomer(booking.customer_id);

    // Processar reembolso
    if (booking.payment_id) {
      // await StripeService.refundPayment(booking.payment_id);
    }

    // Atualizar status
    await BookingService.updateStatus(req.params.id, 'cancelled');

    // Enviar email de cancelamento
    const service = await BookingService.getService(booking.service_id);
    await EmailService.sendBookingCancelled(
      customer.email,
      booking.id,
      service.name,
      'Cancelado pelo cliente'
    );

    res.json({ success: true, message: 'Agendamento cancelado', refunded: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default bookingRouter;

// ============= EXEMPLO 2: STAFF CONTROLLER =============

import { Router, Request, Response } from 'express';
import StaffService from '../services/StaffService';

const staffRouter = Router();

/**
 * GET /api/v1/staff
 * Listar staff com filtros
 */
staffRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, minRating } = req.query;

    const staff = await StaffService.listStaff({
      status: status as any,
      minRating: minRating ? parseInt(minRating as string) : undefined,
    });

    res.json(staff);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/staff/:id
 * Obter perfil + stats do staff
 */
staffRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const profile = await StaffService.getStaffProfile(req.params.id);
    const stats = await StaffService.getStaffStats(req.params.id);
    const reviews = await StaffService.getStaffReviews(req.params.id);

    res.json({
      profile,
      stats,
      reviews,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/staff/:id/dashboard
 * Dashboard do staff com agendamentos de hoje
 */
staffRouter.get('/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await StaffService.getStaffDashboard(req.params.id);

    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/staff/:id/availability
 * Configurar disponibilidade
 */
staffRouter.post('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { dayOfWeek, startTime, endTime, maxBookingsPerDay } = req.body;

    const availability = await StaffService.setRecurringAvailability(
      req.params.id,
      dayOfWeek,
      startTime,
      endTime,
      maxBookingsPerDay
    );

    res.json({ success: true, availability });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default staffRouter;

// ============= EXEMPLO 3: 2FA CONTROLLER =============

import { Router, Request, Response } from 'express';
import TwoFactorService from '../services/TwoFactorService';
import EmailService from '../services/EmailService';

const twoFactorRouter = Router();

/**
 * POST /api/v1/2fa/enable
 * Ativar 2FA para usuário
 */
twoFactorRouter.post('/enable', async (req: Request, res: Response) => {
  try {
    const { userId, method } = req.body;

    if (method === 'totp') {
      // Gerar secret TOTP
      const { secret, qrCode } = await TwoFactorService.generateTOTPSecret(
        req.user.email
      );

      // Ativar 2FA no banco
      const config = await TwoFactorService.enable2FA(userId, 'totp', secret);

      res.json({
        success: true,
        secret,
        qrCode,
        backupCodes: config.backupCodes,
        message: 'Escanear QR Code com Google Authenticator',
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/2fa/verify
 * Verificar código 2FA
 */
twoFactorRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    const isValid = await TwoFactorService.validate2FA(userId, code);

    if (!isValid) {
      return res.status(401).json({ error: 'Código 2FA inválido' });
    }

    // Gerar JWT com 2FA marcado como validado
    const token = generateJWT({ userId, twoFactorVerified: true });

    res.json({
      success: true,
      token,
      message: '2FA validado com sucesso',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/2fa/disable
 */
twoFactorRouter.post('/disable', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    await TwoFactorService.disable2FA(userId);

    res.json({ success: true, message: '2FA desativado' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default twoFactorRouter;

// ============= EXEMPLO 4: REVIEWS CONTROLLER =============

import { Router, Request, Response } from 'express';
import ReviewService from '../services/ReviewService';
import AnalyticsService from '../services/AnalyticsService';

const reviewRouter = Router();

/**
 * POST /api/v1/reviews
 * Criar nova avaliação
 */
reviewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      bookingId,
      staffId,
      rating,
      comment,
      categories,
    } = req.body;

    const review = await ReviewService.createReview({
      bookingId,
      staffId,
      customerId: req.user.id,
      rating,
      comment,
      categories,
    });

    // Rastrear evento
    await AnalyticsService.trackEvent(req.user.id, 'review_submitted', {
      booking_id: bookingId,
      rating,
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/reviews/staff/:staffId
 */
reviewRouter.get('/staff/:staffId', async (req: Request, res: Response) => {
  try {
    const reviews = await ReviewService.getStaffReviews(req.params.staffId);
    const stats = await ReviewService.getReviewStats(req.params.staffId);

    res.json({ reviews, stats });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default reviewRouter;

// ============= EXEMPLO 5: GEOLOCATION CONTROLLER =============

import { Router, Request, Response } from 'express';
import GeolocationService from '../services/GeolocationService';

const geoRouter = Router();

/**
 * GET /api/v1/geo/autocomplete
 * Autocomplete de endereços
 */
geoRouter.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query obrigatória' });
    }

    const results = await GeolocationService.autocompleteAddress(
      query as string
    );

    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/geo/geocode
 * Converter endereço em coordenadas
 */
geoRouter.post('/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    const location = await GeolocationService.geocodeAddress(address);

    if (!location) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }

    res.json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default geoRouter;

// ============= EXEMPLO 6: ANALYTICS CONTROLLER =============

import { Router, Request, Response } from 'express';
import AnalyticsService from '../services/AnalyticsService';

const analyticsRouter = Router();

/**
 * POST /api/v1/analytics/track
 * Rastrear evento customizado
 */
analyticsRouter.post('/track', async (req: Request, res: Response) => {
  try {
    const { eventName, parameters } = req.body;

    await AnalyticsService.trackEvent(
      req.user.id,
      eventName,
      parameters
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/analytics/config
 */
analyticsRouter.get('/config', (req: Request, res: Response) => {
  const config = AnalyticsService.getConfiguration();
  res.json(config);
});

export default analyticsRouter;

//
// IMPORTANTE: Adicionar todos esses routers no arquivo principal de rotas:
/
// src/routes/index.ts
//

import bookingRouter from './controllers/BookingController';
import staffRouter from './controllers/StaffController';
import twoFactorRouter from './controllers/TwoFactorController';
import reviewRouter from './controllers/ReviewController';
import geoRouter from './controllers/GeolocationController';
import analyticsRouter from './controllers/AnalyticsController';

const router = Router();

router.use('/bookings', bookingRouter);
router.use('/staff', staffRouter);
router.use('/2fa', twoFactorRouter);
router.use('/reviews', reviewRouter);
router.use('/geo', geoRouter);
router.use('/analytics', analyticsRouter);

export default router;
