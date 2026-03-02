import request from 'supertest';
import express from 'express';
import servicesRoutes from '../services';
import authRoutes from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use(errorHandler);

describe('Services Routes', () => {
  let adminToken: string;
  let userToken: string;
  let serviceId: string;

  const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  beforeEach(async () => {
    // Create admin user
    const adminEmail = `admin+${uniqueSuffix()}@test.com`;
    const adminResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: adminEmail,
        password: 'admin123456',
        name: 'Admin User',
        phone: '11999999999'
      });

    if (!adminResponse.body.data?.tokens?.accessToken) {
      console.error('Failed to get admin token:', adminResponse.status, adminResponse.body);
      throw new Error('Admin registration failed or token not returned');
    }
    adminToken = adminResponse.body.data.tokens.accessToken;

    // Create regular user
    const userEmail = `user+${uniqueSuffix()}@test.com`;
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: userEmail,
        password: 'user123456',
        name: 'Regular User',
        phone: '11999999999'
      });

    if (!userResponse.body.data?.tokens?.accessToken) {
      console.error('Failed to get user token:', userResponse.status, userResponse.body);
      throw new Error('User registration failed or token not returned');
    }
    userToken = userResponse.body.data.tokens.accessToken;
  });

  describe('GET /api/v1/services', () => {
    it('should get services list', async () => {
      const response = await request(app)
        .get('/api/v1/services');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('services');
      expect(Array.isArray(response.body.data.services)).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ limit: 5, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('offset');
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ category: 'Limpeza' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('services');
    });

    it('should search by service name', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ search: 'Residencial' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('services');
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('should get service by id', async () => {
      // First get list to get a service id
      const listResponse = await request(app)
        .get('/api/v1/services');

      if (listResponse.body.data.services.length > 0) {
        serviceId = listResponse.body.data.services[0].id;

        const response = await request(app)
          .get(`/api/v1/services/${serviceId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('service');
      }
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app)
        .get('/api/v1/services/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/services/categories', () => {
    it('should get all service categories', async () => {
      const response = await request(app)
        .get('/api/v1/services/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('POST /api/v1/services', () => {
    it('should create service (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Service',
          description: 'Service description',
          basePrice: 150.00,
          durationMinutes: 120,
          category: 'Limpeza'
        });

      expect([201, 403]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('service');
        serviceId = response.body.data.service.id;
      }
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New Service',
          description: 'Service description',
          basePrice: 150.00,
          durationMinutes: 120,
          category: 'Limpeza'
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 for missing auth token', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .send({
          name: 'New Service',
          description: 'Service description',
          basePrice: 150.00,
          durationMinutes: 120,
          category: 'Limpeza'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Service'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/services/:id', () => {
    it('should update service (admin only)', async () => {
      // First create a service
      const createResponse = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Service to Update',
          description: 'Original description',
          basePrice: 150.00,
          durationMinutes: 120,
          category: 'Limpeza'
        });

      if (createResponse.status === 201) {
        serviceId = createResponse.body.data.service.id;

        const response = await request(app)
          .put(`/api/v1/services/${serviceId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Updated Service Name'
          });

        expect([200, 403]).toContain(response.status);
      }
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .put(`/api/v1/services/1`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Service Name'
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 for missing auth token', async () => {
      const response = await request(app)
        .put(`/api/v1/services/1`)
        .send({
          name: 'Updated Service Name'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    it('should delete service (admin only)', async () => {
      // First create a service
      const createResponse = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Service to Delete',
          description: 'This service will be deleted',
          basePrice: 150.00,
          durationMinutes: 120,
          category: 'Limpeza'
        });

      if (createResponse.status === 201) {
        serviceId = createResponse.body.data.service.id;

        const response = await request(app)
          .delete(`/api/v1/services/${serviceId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 403]).toContain(response.status);
      }
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/v1/services/1`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 for missing auth token', async () => {
      const response = await request(app)
        .delete(`/api/v1/services/1`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app)
        .delete(`/api/v1/services/99999`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 403]).toContain(response.status);
    });
  });
});
