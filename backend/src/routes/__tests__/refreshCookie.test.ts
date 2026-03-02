import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe('Auth refresh via HttpOnly cookie', () => {
  it('should set HttpOnly cookie on register/login and refresh using cookie', async () => {
    const agent = request.agent(app);
    const email = `cookie+${uniqueSuffix()}@test.com`;

    // Register - should set cookie
    const regRes = await agent.post('/api/v1/auth/register').send({
      email,
      password: 'password123',
      name: 'Cookie User',
      phone: '11999999999'
    });
    expect(regRes.status).toBe(201);
    // make sure Set-Cookie header was returned
    // (log for debugging in case of future failures)
    // eslint-disable-next-line no-console
    console.log('register headers:', regRes.headers);
    expect(regRes.headers['set-cookie']).toBeDefined();

    // Agent should store cookie; now call refresh endpoint without body
    const refreshRes = await agent.post('/api/v1/auth/refresh-token').send();
    // eslint-disable-next-line no-console
    console.log('refresh response status/cookies', refreshRes.status, refreshRes.headers);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('data');
    expect(refreshRes.body.data.tokens).toHaveProperty('accessToken');
    expect(refreshRes.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('should accept refresh token from body when cookie absent', async () => {
    const email = `cookiebody+${uniqueSuffix()}@test.com`;
    // Create a plain app without cookie parser to simulate cookie absent
    const appNoCookie = express();
    appNoCookie.use(express.json());
    appNoCookie.use('/api/v1/auth', authRoutes);
    appNoCookie.use(errorHandler);

    // Register to get tokens
    const reg = await request(appNoCookie).post('/api/v1/auth/register').send({
      email,
      password: 'password123',
      name: 'Cookie Body User',
      phone: '11999999999'
    });
    expect(reg.status).toBe(201);
    const refreshToken = reg.body.data.tokens.refreshToken;

    const res = await request(appNoCookie).post('/api/v1/auth/refresh-token').send({ refreshToken });
    // eslint-disable-next-line no-console
    console.log('body refresh:', res.body, 'status', res.status);
    expect(res.status).toBe(200);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });
});
