"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.asyncHandler = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const sentry_1 = __importDefault(require("../utils/sentry"));
const errorHandler = (err, req, res, _next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    // Log detalhado do erro
    logger_1.logger.error(`[${status}] ${message}`, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code
        },
        request: {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: {
                ...req.headers,
                authorization: req.headers.authorization ? '[REDACTED]' : undefined
            }
        }
    });
    // Em produção, enviar para Sentry
    if (process.env.NODE_ENV === 'production') {
        // Capturar exceção no Sentry com contexto adicional
        sentry_1.default.captureException(err, {
            tags: {
                service: 'backend',
                path: req.path,
                method: req.method,
            },
            extra: {
                status,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            },
            user: req.user ? {
                id: req.user.id,
                email: req.user.email,
            } : undefined,
        });
    }
    const response = {
        error: {
            message: status === 500 ? 'Internal Server Error' : message,
            status,
            timestamp: new Date().toISOString()
        },
    };
    // Em desenvolvimento, incluir mais detalhes
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
        response.error.details = err;
    }
    res.status(status).json(response);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const ApiError = (message, status = 500) => {
    const error = new Error(message);
    error.status = status;
    return error;
};
exports.ApiError = ApiError;
//# sourceMappingURL=errorHandler.js.map