/**
 * Serviço PIX - Implementação Real Funcional
 *
 * - Geração de PIX cópia e cola (formato EMV realista)
 * - QR Code em base64
 * - Armazenamento de transações
 * - Validação de documentos (CPF/CNPJ)
 *
 * NOTA: Valores são simulados, sem integração com Banco Central real
 * Para produção, integrar com gateway oficial (Asaas, Stripe, etc)
 */
export interface PIXTransaction {
    id: string;
    bookingId: string;
    amount: number;
    qrCode: string;
    pixCopyPaste: string;
    status: 'pending' | 'paid' | 'expired';
    expiresAt: number;
    createdAt: number;
}
export declare class PIXService {
    /**
     * Criar transação PIX funcional com QR Code
     */
    static createTransaction(bookingId: string, amount: number): Promise<PIXTransaction>;
    /**
     * Gerar string PIX em formato EMV/ABNT
     * Versão simplificada mas estruturalmente válida
     */
    private static generatePixCopyPaste;
    /**
     * Obter transação
     */
    static getTransaction(transactionId: string): PIXTransaction | undefined;
    /**
     * Confirmar pagamento (marcar como pago)
     */
    static confirmPayment(transactionId: string): boolean;
    /**
     * Limpar transações expiradas
     */
    static cleanupExpiredTransactions(): void;
    /**
     * Testar validação de documentos
     */
    static validateCPF(cpf: string): boolean;
    static validateCNPJ(cnpj: string): boolean;
}
export default PIXService;
//# sourceMappingURL=PIXService.d.ts.map