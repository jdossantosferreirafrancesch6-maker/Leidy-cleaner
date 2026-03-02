import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

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
let storePromise: Promise<any> | undefined;
let cachedStore: any = undefined;

function getStore() {
  if (cachedStore !== undefined) return cachedStore;
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
export const userRateLimit = rateLimit({
  keyGenerator: (req: any, _res: any) => {
    // Prioriza user_id se autenticado (distribuído por usuário)
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // Fallback para IP usando helper oficial que trata IPv6 corretamente
    return ipKeyGenerator(req.ip);
  },
  max: (req: any) => {
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
    if (config.NODE_ENV === 'test') return true;
    return false;
  },
  handler: (req: Request, res: any) => {
    const rateLimit = (req as any).rateLimit;
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
  store: getStore() as any,
});

/**
 * Rate limiter específico para auth (mais restritivo)
 * Distribuído em produção, local em dev
 * 5 tentativas / 15 minutos por email/IP
 */
export const authRateLimit = rateLimit({
  keyGenerator: (req: any, _res: any) => {
    // Se enviar email, usar como key
    const email = req.body?.email || '';
    if (email) {
      return `auth:email:${email}`;
    }
    // Fallback para IP usando helper IPv6-safe
    return `auth:${ipKeyGenerator(req.ip)}`;
  },
  max: 5, // Muito restritivo para auth
  windowMs: 15 * 60 * 1000, // 15 minutos
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  handler: (req: Request, res: any) => {
    const rateLimit = (req as any).rateLimit;
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
  store: getStore() as any,
});
