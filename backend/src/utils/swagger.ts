import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  // swagger-jsdoc v6 uses `definition` instead of `swaggerDefinition`
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Leidy Cleaner API',
      version: '1.0.0',
      description: 'API de serviços de limpeza com autenticação JWT',
      contact: {
        name: 'API Support',
        email: 'support@leidycleaner.com'
      }
    },
    servers: [
      {
        url: 'http://localhost/api/v1',
        description: 'Development Server'
      },
      {
        url: 'https://api.leidycleaner.com/api/v1',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'customer'] },
            bio: { type: 'string' },
            photoUrl: { type: 'string' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            basePrice: { type: 'number' },
            durationMinutes: { type: 'integer' },
            isActive: { type: 'boolean' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            serviceId: { type: 'string' },
            scheduledDate: { type: 'string', format: 'date-time' },
            address: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
            totalPrice: { type: 'number' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            status: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Registrar novo usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                    phone: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Usuário criado com sucesso' },
            '400': { description: 'Dados inválidos' }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Fazer login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login bem-sucedido' },
            '400': { description: 'Credenciais inválidas' }
          }
        }
      },
      '/services': {
        get: {
          tags: ['Services'],
          summary: 'Listar todos os serviços',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10 }
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 }
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': { description: 'Lista de serviços' }
          }
        },
        post: {
          tags: ['Services'],
          summary: 'Criar novo serviço (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Service' }
              }
            }
          },
          responses: {
            '201': { description: 'Serviço criado' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Apenas admin' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: any) {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { 
    swaggerOptions: {
      persistAuthorization: true
    }
  }));
  
  app.get('/api/v1/docs.json', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('📚 Swagger disponível em: http://localhost/api/v1/docs');
}
