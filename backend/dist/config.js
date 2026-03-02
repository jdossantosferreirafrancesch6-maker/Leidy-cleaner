"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_ALLOWED = exports.DB_TYPE = exports.FRONTEND_URL = exports.NODE_ENV = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// load .env variables immediately when the module is imported
dotenv_1.default.config();
exports.PORT = Number(process.env.PORT) || 3001;
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
exports.DB_TYPE = process.env.DB_TYPE || 'postgres';
exports.CORS_ALLOWED = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://leidycleaner.com',
].filter(Boolean);
//# sourceMappingURL=config.js.map