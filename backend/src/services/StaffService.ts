import { query } from '../utils/database';
import { User, Availability } from '../types/auth';

export class StaffService {
  static async listStaff(): Promise<User[]> {
    const result = await query(
      `SELECT id, email, full_name as name, phone, role, bio, photo_url as "photoUrl"
       FROM users WHERE role = 'staff'`);
    return result;
  }

  static async getById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, full_name as name, phone, role, bio, photo_url as "photoUrl"
       FROM users WHERE id = $1 AND role = 'staff'`,
      [id]
    );
    return result.length > 0 ? result[0] : null;
  }

  static async updateProfile(id: string, updates: Partial<User>): Promise<User | null> {
    // reuse AuthService.updateUser since it already handles bio/photoUrl
    const { AuthService } = require('./AuthService');
    return AuthService.updateUser(id, updates);
  }

  static async getAvailability(staffId: string): Promise<Availability[]> {
    const result = await query(
      `SELECT id, staff_id as "staffId", day, start_time as "startTime", end_time as "endTime"
       FROM staff_availability WHERE staff_id = $1 ORDER BY day, start_time`,
      [staffId]
    );
    return result;
  }

  static async getReviewsForStaff(staffId: string): Promise<any[]> {
    const result = await query(
      `SELECT r.*
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       WHERE b.staff_id = $1 AND r.is_approved = TRUE
       ORDER BY r.created_at DESC`,
      [staffId]
    );
    return result;
  }

  static async getAverageRating(staffId: string): Promise<number> {
    const result = await query(
      `SELECT AVG(r.rating) as avg
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       WHERE b.staff_id = $1 AND r.is_approved = TRUE`,
      [staffId]
    );
    const avg = result[0]?.avg;
    return avg !== null && avg !== undefined ? parseFloat(avg) : 0;
  }

  static async setAvailability(staffId: string, slots: { day: string; startTime: string; endTime: string }[]): Promise<Availability[]> {
    // remove existing
    await query('DELETE FROM staff_availability WHERE staff_id = $1', [staffId]);
    if (slots.length === 0) return [];
    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;
    for (const slot of slots) {
      values.push(staffId, slot.day, slot.startTime, slot.endTime);
      placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    }
    const insertSQL = `INSERT INTO staff_availability (staff_id, day, start_time, end_time) VALUES ${placeholders.join(', ')} RETURNING id, staff_id as "staffId", day, start_time as "startTime", end_time as "endTime"`;
    const res = await query(insertSQL, values);
    return res;
  }

  /**
   * Obter agendamentos do staff com status
   */
  static async getStaffBookings(staffId: string, status?: string): Promise<any[]> {
    let sql = `
      SELECT 
        b.id, b.customer_id as "customerId", b.service_id as "serviceId",
        b.scheduled_date as "scheduledDate", b.status, b.total_price as "totalPrice",
        s.name as "serviceName",
        c.name as "customerName", c.phone as "customerPhone", c.address,
        b.notes, b.completed_at as "completedAt"
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users c ON b.customer_id = c.id
      WHERE b.staff_id = $1
    `;
    const params: any[] = [staffId];

    if (status) {
      sql += ` AND b.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY b.scheduled_date DESC`;
    return await query(sql, params);
  }

  /**
   * Dashboard do Staff - Hoje e Próximos 7 dias
   */
  static async getStaffDashboard(staffId: string): Promise<{
    today: any[];
    upcoming: any[];
    stats: any;
  }> {
    const today = await query(
      `SELECT * FROM bookings 
       WHERE staff_id = $1 AND scheduled_date::date = CURRENT_DATE AND status != 'cancelled'
       ORDER BY scheduled_date ASC`,
      [staffId]
    );

    const upcoming = await query(
      `SELECT * FROM bookings 
       WHERE staff_id = $1 AND scheduled_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
       AND status != 'cancelled'
       ORDER BY scheduled_date ASC`,
      [staffId]
    );

    const stats = await this.getStaffStats(staffId);

    return { today, upcoming, stats };
  }

  /**
   * Obter estatísticas de desempenho
   */
  static async getStaffStats(staffId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status IN ('completed', 'pending', 'confirmed', 'in_progress')) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'in_progress') AND scheduled_date > NOW()) as current_bookings,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM bookings b
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE b.staff_id = $1`,
      [staffId]
    );

    return result[0] || {
      total_bookings: 0,
      completed_bookings: 0,
      cancelled_bookings: 0,
      current_bookings: 0,
      avg_rating: 0,
      review_count: 0,
    };
  }

  /**
   * Verificar se staff está disponível em data/hora específica
   */
  static async isAvailable(staffId: string, dateTime: Date): Promise<boolean> {
    const dayOfWeek = dateTime.getDay();
    const timeStr = dateTime.getHours().toString().padStart(2, '0') + ':' 
                  + dateTime.getMinutes().toString().padStart(2, '0');

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    const availability = await query(
      `SELECT COUNT(*) as count FROM staff_availability 
       WHERE staff_id = $1 AND day = $2 
       AND start_time <= $3::time AND end_time > $3::time`,
      [staffId, dayName, timeStr]
    );

    return parseInt(availability[0]?.count || '0') > 0;
  }

  /**
   * Atribuir agendamento a um staff
   */
  static async assignBooking(bookingId: string, staffId: string): Promise<any> {
    const result = await query(
      `UPDATE bookings 
       SET staff_id = $1, status = 'confirmed', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [staffId, bookingId]
    );
    return result[0];
  }

  /**
   * Atualizar status do agendamento
   */
  static async updateBookingStatus(
    bookingId: string, 
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<any> {
    const result = await query(
      `UPDATE bookings 
       SET status = $1, updated_at = NOW()
       ${status === 'completed' ? ', completed_at = NOW()' : ''}
       WHERE id = $2
       RETURNING *`,
      [status, bookingId]
    );
    return result[0];
  }

  /**
   * Adicionar folga especial (férias, atestado)
   */
  static async addSpecialDate(
    staffId: string,
    startDate: string,
    endDate: string,
    type: 'vacation' | 'sick_leave' | 'other',
    reason?: string
  ): Promise<any> {
    const result = await query(
      `INSERT INTO special_dates 
       (staff_id, start_date, end_date, type, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [staffId, startDate, endDate, type, reason]
    );
    return result[0];
  }

  /**
   * Listar folgas especiais
   */
  static async getSpecialDates(staffId: string): Promise<any[]> {
    return await query(
      `SELECT * FROM special_dates 
       WHERE staff_id = $1 AND end_date >= CURRENT_DATE
       ORDER BY start_date ASC`,
      [staffId]
    );
  }

  /**
   * Listar staff com melhores ratings
   */
  static async getTopStaff(limit: number = 10): Promise<any[]> {
    return await query(
      `SELECT 
        u.id, u.full_name as name, u.email, u.phone, u.role, 
        u.bio, u.photo_url as "photoUrl",
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT b.id) as "totalBookings"
      FROM users u
      LEFT JOIN reviews r ON u.id = r.staff_id AND r.is_approved = TRUE
      LEFT JOIN bookings b ON u.id = b.staff_id
      WHERE u.role = 'staff'
      GROUP BY u.id
      ORDER BY rating DESC, "totalBookings" DESC
      LIMIT $1`,
      [limit]
    );
  }
}

export default StaffService;
