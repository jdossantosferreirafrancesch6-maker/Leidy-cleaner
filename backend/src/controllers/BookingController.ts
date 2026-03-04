import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { query } from '../utils/database';
import BookingService from '../services/BookingService';
import { calculateServicePrice } from '../utils/priceCalculator';
import { camelize } from '../utils/transformers';
import { ReminderService } from '../services/ReminderService';
import NotificationService from '../services/NotificationService';
import { t } from '../utils/i18n';

export class BookingController {
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    // validate input with Joi schema
    const { bookingSchema } = require('../utils/schemas');
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    const { serviceId, bookingDate, address, notes, staffId } = value;

    // if staffId provided validate role
    if (staffId) {
      const existing = await query('SELECT role FROM users WHERE id = $1', [staffId]);
      if (existing.length === 0 || existing[0].role !== 'staff') {
        throw ApiError(t('invalidStaffMember'), 400);
      }
    }

    // compute price using service data
    const { ServiceService } = require('../services/ServiceService');
    const service = await ServiceService.getById(serviceId);
    if (!service) {
      throw ApiError(t('serviceNotFound'), 404);
    }

    // service.duration_minutes from DB (snake_case) or service.durationMinutes (camelized)
    const durationMinutes = Number(service.durationMinutes || service.duration_minutes || 60);
    const totalPrice = calculateServicePrice(durationMinutes, false); // false = duration in minutes

    const booking = await BookingService.createBooking(
      req.user.id,
      serviceId,
      bookingDate,
      totalPrice,
      address,
      notes,
      staffId
    );

    // fire off notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        // call static notification method (mocked in tests)
        await NotificationService.notifyBookingCreated({
          id: booking.id,
          user_id: req.user?.id,
          service_name: (await query('SELECT name FROM services WHERE id = $1', [serviceId]))[0]?.name,
          scheduled_date: bookingDate,
          total_price: totalPrice,
          address: address,
          notes: notes,
          staff_id: staffId
        });

        // Agendar lembretes automáticos
        const bookingData = {
          id: booking.id,
          bookingId: booking.id,
          // `users` table uses `full_name` column; alias it as `name` so both
          // Postgres and SQLite return the field the notification logic expects.
          customerName: (await query('SELECT full_name AS name FROM users WHERE id = $1', [req.user?.id]))[0]?.name,
          customerEmail: (await query('SELECT email FROM users WHERE id = $1', [req.user?.id]))[0]?.email,
          serviceName: (await query('SELECT name FROM services WHERE id = $1', [serviceId]))[0]?.name,
          scheduledDate: bookingDate,
          totalPrice: totalPrice,
          address: address,
          notes: notes
        };
        ReminderService.scheduleReminders(bookingData);
      } catch (error) {
        console.error('Erro ao enviar notificações de agendamento:', error);
      }
    });

    res.status(201).json({ message: t('bookingCreated'), data: { booking: camelize(booking) } });
  });

  static listByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);

    const bookings = await BookingService.getBookingsByUser(req.user.id);
    res.status(200).json({ message: t('bookingsRetrieved'), data: { bookings: camelize(bookings) } });
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const booking = await BookingService.getById(id);

    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    // Only owner or admin can view
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);
    if (req.user.role !== 'admin' && String(booking.user_id) !== req.user.id) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    const respBooking = camelize(booking);
    res.status(200).json({ message: t('bookingRetrieved'), data: { booking: respBooking } });
  });

  static updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    if (!req.user) throw ApiError(t('notAuthenticated'), 401);
    if (req.user.role !== 'admin') throw ApiError(t('onlyAdminsUpdateBookings'), 403);

    const booking = await BookingService.updateStatus(id, status);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);

    res.status(200).json({ message: t('bookingStatusUpdated'), data: { booking: camelize(booking) } });
  });

  static remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    if (!req.user) throw ApiError(t('notAuthenticated'), 401);
    // allow owner or admin to delete
    const booking = await BookingService.getById(id);
    if (!booking) throw ApiError(t('bookingNotFound'), 404);
    if (req.user.role !== 'admin' && String(booking.user_id) !== req.user.id) {
      throw ApiError(t('insufficientPermissions'), 403);
    }

    await BookingService.delete(id);
    res.status(200).json({ message: t('bookingDeleted') });
  });

  // admin endpoint: retrieve all bookings
  static listAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw ApiError(t('onlyAdminsViewAllBookings'), 403);
    }

    const bookings = await BookingService.getAllBookings();
    res.status(200).json({ message: t('bookingsRetrieved'), data: { bookings: camelize(bookings) } });
  });

  // staff endpoints
  static assignStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw ApiError(t('onlyAdminsUpdateBookings'), 403);
    }
    const { assignStaffSchema } = require('../utils/schemas');
    const { error, value } = assignStaffSchema.validate(req.body);
    if (error) throw ApiError(error.details[0].message, 400);

    const { bookingId, staffId } = value;
    const updated = await BookingService.assignStaff(bookingId, staffId);
    if (!updated) {
      throw ApiError(t('bookingNotFound'), 404);
    }
    res.status(200).json({ message: t('staffAssigned'), data: { booking: camelize(updated) } });
  });

  static listByStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw ApiError(t('notAuthenticated'), 401);
    // staff or admin can use this
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      throw ApiError(t('onlyStaffViewBookings'), 403);
    }
    const staffId = req.user.id;
    const bookings = await BookingService.getBookingsByStaff(staffId);
    res.status(200).json({ message: t('bookingsRetrieved'), data: { bookings: camelize(bookings) } });
  });
}

export default BookingController
