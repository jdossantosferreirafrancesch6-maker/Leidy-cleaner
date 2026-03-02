/**
 * Rate limiter por User ID
 * Protege contra bot abuse mesmo em rede compartilhada (NAT)
 *
 * Distribuído em produção (Redis), local em dev
 * Limits:
 * - Usuários autenticados: 100 req/15min
 * - IP anônimo: 50 req/15min
 */
export declare const userRateLimit: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter específico para auth (mais restritivo)
 * Distribuído em produção, local em dev
 * 5 tentativas / 15 minutos por email/IP
 */
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=userRateLimit.d.ts.map