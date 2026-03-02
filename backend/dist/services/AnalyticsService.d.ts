export interface AnalyticsMetrics {
    totalUsers: number;
    activeUsers: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
    topServices: Array<{
        name: string;
        count: number;
        revenue: number;
    }>;
    revenueByMonth: Array<{
        month: string;
        revenue: number;
        bookings: number;
    }>;
    userGrowth: Array<{
        month: string;
        newUsers: number;
        totalUsers: number;
    }>;
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
export declare class AnalyticsService {
    /**
     * Obtém métricas gerais de analytics
     */
    static getMetrics(startDate?: string, endDate?: string): Promise<AnalyticsMetrics>;
    /**
     * Obtém estatísticas do dashboard
     */
    static getDashboardStats(): Promise<DashboardStats>;
    /**
     * Gera relatório de performance de staff
     */
    static getStaffPerformance(): Promise<Array<{
        staffId: string;
        staffName: string;
        totalBookings: number;
        completedBookings: number;
        averageRating: number;
        totalRevenue: number;
        efficiency: number;
    }>>;
    /**
     * Enviar evento customizado para GA4
     */
    static trackEvent(userId: string, eventName: string, parameters?: Record<string, any>): Promise<void>;
    /**
     * Evento de compra (conversão)
     */
    static trackPurchase(userId: string, transactionData: {
        bookingId?: string;
        value: number;
        currency?: string;
    }): Promise<void>;
    /**
     * Evento de busca
     */
    static trackSearch(userId: string, searchQuery: string, resultsCount: number): Promise<void>;
    /**
     * Verifica se GA4 está configurado
     */
    static isGA4Configured(): boolean;
    /**
     * Exporta dados para CSV
     */
    static exportBookingsCSV(startDate?: string, endDate?: string): Promise<string>;
}
//# sourceMappingURL=AnalyticsService.d.ts.map