import { query } from '../utils/database';
import { logger } from '../utils/logger-advanced';
import axios from 'axios';
import { sqlMonth } from '../utils/sql';

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; bookings: number }>;
  userGrowth: Array<{ month: string; newUsers: number; totalUsers: number }>;
  bookingStatusDistribution: Record<string, number>;
  averageRating: number;
  totalReviews: number;
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  pendingBookings: number;
  activeChats: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  alerts: string[];
}

export class AnalyticsService {
  /**
   * Obtém métricas gerais de analytics
   */
  static async getMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsMetrics> {
    try {
      const dateFilter = startDate && endDate
        ? `WHERE created_at BETWEEN '${startDate}' AND '${endDate}'`
        : '';

      // Usuários
      const usersResult = await query('SELECT COUNT(*) as count FROM users');
      const activeUsersResult = await query(
        `SELECT COUNT(*) as count FROM users WHERE last_login > ${require('../utils/sql').sqlAgoDays(30)}`
      );

      // Bookings
      const bookingsResult = await query(`SELECT COUNT(*) as count FROM bookings ${dateFilter.replace('created_at', 'created_at')}`);
      const completedResult = await query(`SELECT COUNT(*) as count FROM bookings WHERE status = 'completed' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '').replace('created_at', 'created_at') : ''}`);
      const cancelledResult = await query(`SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '').replace('created_at', 'created_at') : ''}`);

      // Receita
      const revenueResult = await query(`
        SELECT COALESCE(SUM(total_price), 0) as revenue,
               COUNT(*) as booking_count
        FROM bookings
        WHERE status = 'completed' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '').replace('created_at', 'created_at') : ''}
      `);

      // Serviços mais populares
      const topServicesResult = await query(`
        SELECT s.name, COUNT(b.id) as count, COALESCE(SUM(b.total_price), 0) as revenue
        FROM services s
        LEFT JOIN bookings b ON b.service_id = s.id AND b.status = 'completed'
        GROUP BY s.id, s.name
        ORDER BY count DESC
        LIMIT 10
      `);

      // Receita por mês
      const monthExpr = sqlMonth('created_at');
      const revenueByMonthResult = await query(`
        SELECT
          ${monthExpr} as month,
          COALESCE(SUM(total_price), 0) as revenue,
          COUNT(*) as bookings
        FROM bookings
        WHERE status = 'completed'
        GROUP BY ${monthExpr}
        ORDER BY month DESC
        LIMIT 12
      `);

      // Crescimento de usuários
      const userGrowthResult = await query(`
        SELECT
          ${monthExpr} as month,
          COUNT(*) as new_users,
          SUM(COUNT(*)) OVER (ORDER BY ${monthExpr}) as total_users
        FROM users
        GROUP BY ${monthExpr}
        ORDER BY month DESC
        LIMIT 12
      `);

      // Distribuição de status
      const statusDistributionResult = await query(`
        SELECT status, COUNT(*) as count
        FROM bookings
        GROUP BY status
      `);

      // Reviews
      const reviewsResult = await query(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
        FROM reviews
        WHERE is_approved = true
      `);

      const statusDistribution: Record<string, number> = {};
      statusDistributionResult.forEach((row: any) => {
        statusDistribution[row.status] = parseInt(row.count);
      });

      return {
        totalUsers: parseInt(usersResult[0].count),
        activeUsers: parseInt(activeUsersResult[0].count),
        totalBookings: parseInt(bookingsResult[0].count),
        completedBookings: parseInt(completedResult[0].count),
        cancelledBookings: parseInt(cancelledResult[0].count),
        totalRevenue: parseFloat(revenueResult[0].revenue),
        averageBookingValue: revenueResult[0].booking_count > 0
          ? parseFloat(revenueResult[0].revenue) / parseInt(revenueResult[0].booking_count)
          : 0,
        topServices: topServicesResult.map((row: any) => ({
          name: row.name,
          count: parseInt(row.count),
          revenue: parseFloat(row.revenue)
        })),
        revenueByMonth: revenueByMonthResult.map((row: any) => ({
          month: row.month,
          revenue: parseFloat(row.revenue),
          bookings: parseInt(row.bookings)
        })),
        userGrowth: userGrowthResult.map((row: any) => ({
          month: row.month,
          newUsers: parseInt(row.new_users),
          totalUsers: parseInt(row.total_users)
        })),
        bookingStatusDistribution: statusDistribution,
        averageRating: parseFloat(reviewsResult[0].avg_rating || 0),
        totalReviews: parseInt(reviewsResult[0].total_reviews || 0)
      };
    } catch (error) {
      logger.error('Error getting analytics metrics:', error);
      throw new Error('Failed to get analytics metrics');
    }
  }

  /**
   * Obtém estatísticas do dashboard
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Bookings de hoje
      const todayBookingsResult = await query(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      // Receita de hoje
      const todayRevenueResult = await query(`
        SELECT COALESCE(SUM(total_price), 0) as revenue
        FROM bookings
        WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'
      `);

      // Bookings pendentes
      const pendingBookingsResult = await query(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE status IN ('pending', 'confirmed')
      `);

      // Chats ativos (últimas 24h)
      const activeChatsResult = await query(`
        SELECT COUNT(*) as count
        FROM chat_rooms
        WHERE updated_at > ${require('../utils/sql').sqlAgoHours(24)}
      `);

      // Verificar saúde do sistema
      const alerts: string[] = [];
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Verificar se há bookings sem staff atribuído
      const unassignedBookings = await query(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE status = 'confirmed' AND staff_id IS NULL
      `);

      if (parseInt(unassignedBookings[0].count) > 0) {
        alerts.push(`${unassignedBookings[0].count} bookings sem staff atribuído`);
        systemHealth = 'warning';
      }

      // Verificar reviews pendentes
      const pendingReviews = await query(`
        SELECT COUNT(*) as count
        FROM reviews
        WHERE is_approved = false
      `);

      if (parseInt(pendingReviews[0].count) > 10) {
        alerts.push(`${pendingReviews[0].count} reviews aguardando aprovação`);
        if (systemHealth === 'warning') {
          systemHealth = 'critical';
        } else {
          systemHealth = 'warning';
        }
      }

      return {
        todayBookings: parseInt(todayBookingsResult[0].count),
        todayRevenue: parseFloat(todayRevenueResult[0].revenue),
        pendingBookings: parseInt(pendingBookingsResult[0].count),
        activeChats: parseInt(activeChatsResult[0].count),
        systemHealth,
        alerts
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw new Error('Failed to get dashboard stats');
    }
  }

  /**
   * Gera relatório de performance de staff
   */
  static async getStaffPerformance(): Promise<Array<{
    staffId: string;
    staffName: string;
    totalBookings: number;
    completedBookings: number;
    averageRating: number;
    totalRevenue: number;
    efficiency: number;
  }>> {
    try {
      const result = await query(`
        SELECT
          u.id as staff_id,
          u.full_name as staff_name,
          COUNT(b.id) as total_bookings,
          COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
          AVG(r.rating) as average_rating,
          COALESCE(SUM(b.total_price), 0) as total_revenue,
          CASE
            WHEN COUNT(b.id) > 0 THEN ROUND(CAST(COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS NUMERIC) / COUNT(b.id) * 100, 2)
            ELSE 0
          END as efficiency
        FROM users u
        LEFT JOIN bookings b ON b.staff_id = u.id
        LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_approved = true
        WHERE u.role = 'staff'
        GROUP BY u.id, u.full_name
        ORDER BY total_bookings DESC
      `);

      return result.map((row: any) => ({
        staffId: row.staff_id,
        staffName: row.staff_name,
        totalBookings: parseInt(row.total_bookings),
        completedBookings: parseInt(row.completed_bookings),
        averageRating: parseFloat(row.average_rating || 0),
        totalRevenue: parseFloat(row.total_revenue),
        efficiency: parseFloat(row.efficiency)
      }));
    } catch (error) {
      logger.error('Error getting staff performance:', error);
      throw new Error('Failed to get staff performance');
    }
  }

  // --------- GOOGLE ANALYTICS 4 EVENT TRACKING ---------

  /**
   * Enviar evento customizado para GA4
   */
  static async trackEvent(userId: string, eventName: string, parameters?: Record<string, any>) {
    try {
      const GA4_API_KEY = process.env.GA4_API_KEY;
      const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
      const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

      if (!GA4_API_KEY || !GA4_MEASUREMENT_ID) {
        logger.debug('⚠️ GA4 não configurado, evento não rastreado');
        return;
      }

      const payload = {
        client_id: userId,
        events: [
          {
            name: eventName,
            params: {
              ...parameters,
              timestamp_micros: Date.now() * 1000,
            },
          },
        ],
      };

      await axios.post(`${GA4_ENDPOINT}?api_secret=${GA4_API_KEY}&measurement_id=${GA4_MEASUREMENT_ID}`, payload);
      logger.debug(`📊 Evento rastreado: ${eventName}`);
    } catch (error) {
      logger.debug('Erro ao rastrear evento GA4:', error);
    }
  }

  /**
   * Evento de compra (conversão)
   */
  static async trackPurchase(userId: string, transactionData: { bookingId?: string; value: number; currency?: string }) {
    await this.trackEvent(userId, 'purchase', {
      transaction_id: transactionData.bookingId || `txn_${Date.now()}`,
      value: transactionData.value,
      currency: transactionData.currency || 'BRL',
    });
  }

  /**
   * Evento de busca
   */
  static async trackSearch(userId: string, searchQuery: string, resultsCount: number) {
    await this.trackEvent(userId, 'search', {
      search_term: searchQuery,
      results_count: resultsCount,
    });
  }

  /**
   * Verifica se GA4 está configurado
   */
  static isGA4Configured(): boolean {
    return !!(process.env.GA4_API_KEY && process.env.GA4_MEASUREMENT_ID);
  }


  /**
   * Exporta dados para CSV
   */
  static async exportBookingsCSV(startDate?: string, endDate?: string): Promise<string> {
    try {
      const dateFilter = startDate && endDate
        ? `WHERE b.created_at BETWEEN '${startDate}' AND '${endDate}'`
        : '';

      const result = await query(`
        SELECT
          b.id,
          b.scheduled_date,
          b.status,
          b.total_price,
          b.address,
          u.full_name as customer_name,
          u.email as customer_email,
          s.name as service_name,
          st.full_name as staff_name,
          b.created_at
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN services s ON s.id = b.service_id
        LEFT JOIN users st ON st.id = b.staff_id
        ${dateFilter}
        ORDER BY b.created_at DESC
      `);

      // Criar CSV
      const headers = [
        'ID',
        'Data Agendamento',
        'Status',
        'Valor Total',
        'Endereço',
        'Cliente',
        'Email Cliente',
        'Serviço',
        'Staff',
        'Data Criação'
      ];

      const csvRows = result.map((row: any) => [
        row.id,
        row.scheduled_date,
        row.status,
        row.total_price,
        `"${row.address}"`,
        `"${row.customer_name}"`,
        row.customer_email,
        `"${row.service_name}"`,
        `"${row.staff_name || ''}"`,
        row.created_at
      ]);

      return [headers, ...csvRows].map(row => row.join(',')).join('\n');
    } catch (error) {
      logger.error('Error exporting bookings CSV:', error);
      throw new Error('Failed to export bookings CSV');
    }
  }
}