import { User, Availability } from '../types/auth';
export declare class StaffService {
    static listStaff(): Promise<User[]>;
    static getById(id: string): Promise<User | null>;
    static updateProfile(id: string, updates: Partial<User>): Promise<User | null>;
    static getAvailability(staffId: string): Promise<Availability[]>;
    static getReviewsForStaff(staffId: string): Promise<any[]>;
    static getAverageRating(staffId: string): Promise<number>;
    static setAvailability(staffId: string, slots: {
        day: string;
        startTime: string;
        endTime: string;
    }[]): Promise<Availability[]>;
    /**
     * Obter agendamentos do staff com status
     */
    static getStaffBookings(staffId: string, status?: string): Promise<any[]>;
    /**
     * Dashboard do Staff - Hoje e Próximos 7 dias
     */
    static getStaffDashboard(staffId: string): Promise<{
        today: any[];
        upcoming: any[];
        stats: any;
    }>;
    /**
     * Obter estatísticas de desempenho
     */
    static getStaffStats(staffId: string): Promise<any>;
    /**
     * Verificar se staff está disponível em data/hora específica
     */
    static isAvailable(staffId: string, dateTime: Date): Promise<boolean>;
    /**
     * Atribuir agendamento a um staff
     */
    static assignBooking(bookingId: string, staffId: string): Promise<any>;
    /**
     * Atualizar status do agendamento
     */
    static updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<any>;
    /**
     * Adicionar folga especial (férias, atestado)
     */
    static addSpecialDate(staffId: string, startDate: string, endDate: string, type: 'vacation' | 'sick_leave' | 'other', reason?: string): Promise<any>;
    /**
     * Listar folgas especiais
     */
    static getSpecialDates(staffId: string): Promise<any[]>;
    /**
     * Listar staff com melhores ratings
     */
    static getTopStaff(limit?: number): Promise<any[]>;
}
export default StaffService;
//# sourceMappingURL=StaffService.d.ts.map