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
exports.authRateLimit = exports.userRateLimit = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const config = require('../config');
/**
 * Rate Limit Store Factory
 * Retorna MemoryStore (simples e sem dependências)
 */
async function initializeStore() {
    // Usar apenas MemoryStore por enquanto para simplicidade
    // Redis pode ser adicionado posteriormente se necessário
    return undefined;
}
// Promise de inicialização do store (resolvido assim que disponível)
let storePromise;
let cachedStore = undefined;
function getStore() {
    if (cachedStore !== undefined)
        return cachedStore;
    if (!storePromise) {
        storePromise = initializeStore().then(store => {
            cachedStore = store;
            return store;
        });
    }
    return cachedStore; // Retorna undefined até store estar pronto
}
/**
 * Rate limiter por User ID
 * Protege contra bot abuse mesmo em rede compartilhada (NAT)
 *
 * Distribuído em produção (Redis), local em dev
 * Limits:
 * - Usuários autenticados: 100 req/15min
 * - IP anônimo: 50 req/15min
 */
exports.userRateLimit = (0, express_rate_limit_1.default)({
    keyGenerator: (req, _res) => {
        // Prioriza user_id se autenticado (distribuído por usuário)
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }
        // Fallback para IP usando helper oficial que trata IPv6 corretamente
        return (0, express_rate_limit_1.ipKeyGenerator)(req.ip);
    },
    max: (req) => {
        // Usuários autenticados: mais tolerantes
        if (req.user?.id) {
            return 100;
        }
        // Anônimos: mais restritivo
        return 50;
    },
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: 'Too many requests from this user, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => {
        // Desabilita rate limiting completamente em testes
        if (config.NODE_ENV === 'test')
            return true;
        return false;
    },
    handler: (req, res) => {
        const rateLimit = req.rateLimit;
        const retryAfter = rateLimit?.resetTime
            ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            : 900; // 15 min default
        res.status(429).json({
            error: {
                message: 'Too many requests',
                status: 429,
                retryAfter,
            }
        });
    },
    // Store adaptável: Redis em prod, MemoryStore em dev
    store: getStore(),
});
/**
 * Rate limiter específico para auth (mais restritivo)
 * Distribuído em produção, local em dev
 * 5 tentativas / 15 minutos por email/IP
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    keyGenerator: (req, _res) => {
        // Se enviar email, usar como key
        const email = req.body?.email || '';
        if (email) {
            return `auth:email:${email}`;
        }
        // Fallback para IP usando helper IPv6-safe
        return `auth:${(0, express_rate_limit_1.ipKeyGenerator)(req.ip)}`;
    },
    max: 5, // Muito restritivo para auth
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test',
    handler: (req, res) => {
        const rateLimit = req.rateLimit;
        const retryAfter = rateLimit?.resetTime
            ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            : 900;
        res.status(429).json({
            error: {
                message: 'Too many authentication attempts',
                status: 429,
                retryAfter,
            }
        });
    },
    // Store adaptável: Redis em prod, MemoryStore em dev
    store: getStore(),
});
//# sourceMappingURL=userRateLimit.js.map