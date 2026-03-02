import { query } from '../utils/database';

export class BookingService {
  static async createBooking(
    userId: string,
    serviceId: string,
    scheduledDate: string,
    totalPrice: number,
    address?: string,
    notes?: string,
    staffId?: string
  ) {
    const result = await query(
      `INSERT INTO bookings (user_id, service_id, scheduled_date, total_price, address, notes, staff_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${require('../utils/sql').sqlNow()}, ${require('../utils/sql').sqlNow()}) RETURNING *`, 
      [userId, serviceId, scheduledDate, totalPrice, address || null, notes || null, staffId || null]
    );

    return result[0];
  }

  static async getBookingsByUser(userId: string) {
    const result = await query(
      `SELECT b.*, s.name as service_name FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.user_id = $1 ORDER BY b.scheduled_date DESC`,
      [userId]
    );

    return result;
  }

  static async getById(id: string) {
    const result = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    return result.length > 0 ? result[0] : null;
  }

  static async updateStatus(id: string, status: string) {
    const result = await query(
      `UPDATE bookings SET status = $1, updated_at = ${require('../utils/sql').sqlNow()} WHERE id = $2 RETURNING *`, 
      [status, id]
    );
    return result.length > 0 ? result[0] : null;
  }

  static async delete(id: string) {
    await query('DELETE FROM bookings WHERE id = $1', [id]);
    return true;
  }

  // assign staff to booking
  static async assignStaff(bookingId: string, staffId: string) {
    const result = await query(
      `UPDATE bookings SET staff_id = $1, updated_at = ${require('../utils/sql').sqlNow()} WHERE id = $2 RETURNING *`, 
      [staffId, bookingId]
    );
    return result.length > 0 ? result[0] : null;
  }

  // get bookings assigned to a staff member
  static async getBookingsByStaff(staffId: string) {
    const result = await query(
      `SELECT b.*, s.name as service_name FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.staff_id = $1 ORDER BY b.scheduled_date DESC`,
      [staffId]
    );
    return result;
  }

  // admin helper: list all bookings (with service name)
  static async getAllBookings() {
    const result = await query(
      `SELECT b.*, s.name as service_name 
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       ORDER BY b.scheduled_date DESC`
    );

    return result;
  }
}

export default BookingService;
