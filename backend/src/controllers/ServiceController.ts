import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { ServiceService } from '../services/ServiceService';
import { serviceSchema, serviceUpdateSchema } from '../utils/schemas';
import { cacheService } from '../services/CacheService';
import { camelize } from '../utils/transformers';
import { UserRole } from '../utils/constants';
import { t } from '../utils/i18n';

export class ServiceController {
  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit, offset, category, search } = req.query;

    // Tentar obter do cache Redis
    const cachedResult = await cacheService.getServices();
    if (cachedResult) {
      return res.status(200).json({
        message: t('servicesRetrievedCached'),
        data: { services: cachedResult, cached: true },
      });
    }

    const result = await ServiceService.getAll({
      limit: limit ? parseInt(limit as string) : 10,
      offset: offset ? parseInt(offset as string) : 0,
      category: category as string,
      search: search as string,
    });

    const responseData = {
      services: camelize(result.services),
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 10,
        offset: offset ? parseInt(offset as string) : 0,
      },
    };

    // Cache no Redis por 1 hora
    await cacheService.setServices(result.services);

    return res.status(200).json({
      message: t('servicesRetrieved'),
      data: responseData,
    });
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const service = await ServiceService.getById(id);

    if (!service) {
      throw ApiError(t('serviceNotFound'), 404);
    }

    res.status(200).json({
      message: t('serviceRetrieved'),
      data: { service: camelize(service) },
    });
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Validate payload first
    const { error, value } = serviceSchema.validate(req.body);

    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    // Then check admin role
    if (req.user?.role !== UserRole.ADMIN) {
      throw ApiError(t('onlyAdminsCreateServices'), 403);
    }

    const service = await ServiceService.create({
      name: value.name,
      description: value.description,
      basePrice: value.basePrice,
      durationMinutes: value.durationMinutes,
      category: value.category,
    });

    // Invalidar cache de serviços
    cacheService.clearAll();

    res.status(201).json({
      message: t('serviceCreated'),
      data: { service: camelize(service) },
    });
  });

  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    // Validate payload first (partial updates allowed)
    const { error, value } = serviceUpdateSchema.validate(req.body, {
      allowUnknown: true,
    });

    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    // Then check admin role
    if (req.user?.role !== UserRole.ADMIN) {
      throw ApiError(t('onlyAdminsUpdateServices'), 403);
    }

    const service = await ServiceService.update(id, value);

    if (!service) {
      throw ApiError(t('serviceNotFound'), 404);
    }

    res.status(200).json({
      message: t('serviceUpdated'),
      data: { service: camelize(service) },
    });
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Check admin role
    if (req.user?.role !== UserRole.ADMIN) {
      throw ApiError(t('onlyAdminsDeleteServices'), 403);
    }

    const { id } = req.params as { id: string };

    const service = await ServiceService.getById(id);

    if (!service) {
      throw ApiError(t('serviceNotFound'), 404);
    }

    await ServiceService.delete(id);

    res.status(200).json({
      message: t('serviceDeleted'),
    });
  });

  static getCategories = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const categories = await ServiceService.getCategories();

    res.status(200).json({
      message: t('categoriesRetrieved'),
      data: { categories },
    });
  });
}
