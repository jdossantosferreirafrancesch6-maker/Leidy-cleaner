import dotenv from 'dotenv';

// load .env variables immediately when the module is imported
dotenv.config();

export const PORT = Number(process.env.PORT) || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const DB_TYPE = process.env.DB_TYPE || 'postgres';
export const CORS_ALLOWED = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://leidycleaner.com',
].filter(Boolean) as string[];
