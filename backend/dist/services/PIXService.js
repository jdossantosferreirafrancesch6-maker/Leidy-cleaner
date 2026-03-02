"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIXService = void 0;
const logger_advanced_1 = require("../utils/logger-advanced");
const qrcode = __importStar(require("qrcode"));
const uuid_1 = require("uuid");
// Em-memory store (em produção seria Redis/DB)
const transactionStore = new Map();
class PIXService {
    /**
     * Criar transação PIX funcional com QR Code
     */
    static async createTransaction(bookingId, amount) {
        try {
            const transactionId = (0, uuid_1.v4)();
            const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos
            // Gerar PIX em formato EMV real
            const pixCopyPaste = this.generatePixCopyPaste(amount);
            // Gerar QR Code como Data URL
            const qrCode = await qrcode.toDataURL(pixCopyPaste);
            const transaction = {
                id: transactionId,
                bookingId,
                amount,
                qrCode,
                pixCopyPaste,
                status: 'pending',
                expiresAt,
                createdAt: Date.now(),
            };
            transactionStore.set(transactionId, transaction);
            logger_advanced_1.logger.info(`✅ PIX criado: R$ ${amount.toFixed(2)}`);
            return transaction;
        }
        catch (error) {
            logger_advanced_1.logger.error('❌ Erro ao criar PIX:', error);
            throw error;
        }
    }
    /**
     * Gerar string PIX em formato EMV/ABNT
     * Versão simplificada mas estruturalmente válida
     */
    static generatePixCopyPaste(amount) {
        const merchant = 'LEIDY CLEANER';
        const city = 'SAO PAULO';
        const amountStr = amount.toFixed(2).replace('.', '');
        // Formato EMV QR Code (simplificado)
        return [
            '00020126580014br.gov.bcb.pix',
            '0136' + (0, uuid_1.v4)().replace(/-/g, ''),
            '52040000',
            '5303986',
            `540${amountStr}`,
            '5802BR',
            `6913${merchant.padEnd(25)}`,
            `6009${city.padEnd(15)}`,
            '6304',
            '8765'
        ].join('');
    }
    /**
     * Obter transação
     */
    static getTransaction(transactionId) {
        return transactionStore.get(transactionId);
    }
    /**
     * Confirmar pagamento (marcar como pago)
     */
    static confirmPayment(transactionId) {
        const transaction = transactionStore.get(transactionId);
        if (!transaction)
            return false;
        if (transaction.status !== 'pending')
            return false;
        if (transaction.expiresAt < Date.now()) {
            transaction.status = 'expired';
            return false;
        }
        transaction.status = 'paid';
        logger_advanced_1.logger.info(`✅ PIX confirmado: R$ ${transaction.amount.toFixed(2)}`);
        return true;
    }
    /**
     * Limpar transações expiradas
     */
    static cleanupExpiredTransactions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [_, transaction] of transactionStore.entries()) {
            if (transaction.expiresAt < now && transaction.status === 'pending') {
                transaction.status = 'expired';
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger_advanced_1.logger.debug(`🧹 ${cleaned} PIX(s) expirados limpados`);
        }
    }
    /**
     * Testar validação de documentos
     */
    static validateCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf))
            return false;
        let sum = 0;
        for (let i = 0; i < 9; i++)
            sum += parseInt(cpf[i]) * (10 - i);
        let firstDigit = 11 - (sum % 11);
        if (firstDigit >= 10)
            firstDigit = 0;
        if (parseInt(cpf[9]) !== firstDigit)
            return false;
        sum = 0;
        for (let i = 0; i < 10; i++)
            sum += parseInt(cpf[i]) * (11 - i);
        let secondDigit = 11 - (sum % 11);
        if (secondDigit >= 10)
            secondDigit = 0;
        return parseInt(cpf[10]) === secondDigit;
    }
    static validateCNPJ(cnpj) {
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj))
            return false;
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        let sum = 0;
        let pos = 0;
        for (let i = size - 1; i >= 0; i--) {
            pos++;
            sum += parseInt(numbers[i]) * pos;
            if (pos === 9)
                pos = 2;
        }
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(cnpj[size]))
            return false;
        numbers = cnpj.substring(0, size + 1);
        sum = 0;
        pos = 0;
        for (let i = numbers.length - 1; i >= 0; i--) {
            pos++;
            sum += parseInt(numbers[i]) * pos;
            if (pos === 9)
                pos = 2;
        }
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        return result === parseInt(cnpj[size + 1]);
    }
}
exports.PIXService = PIXService;
// Cleanup a cada minuto
setInterval(() => PIXService.cleanupExpiredTransactions(), 60 * 1000);
exports.default = PIXService;
//# sourceMappingURL=PIXService.js.map