import { Response } from 'express';
import { asyncHandler, ApiError, AuthRequest } from '../middleware/errorHandler';
import CompanyService from '../services/CompanyService';
import { t } from '../utils/i18n';

export class CompanyController {
  static getInfo = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const company = await CompanyService.getLatest();
    if (!company) throw ApiError(t('companyInfoNotFound'), 404);
    res.status(200).json({ message: t('companyInfoRetrieved'), data: { company } });
  });

  static upsert = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw ApiError(t('onlyAdminsUpdateCompanyInfo'), 403);
    const info = req.body;
    const updated = await CompanyService.upsert(info);
    res.status(200).json({ message: t('companyInfoUpdated'), data: { company: updated } });
  });
}

export default CompanyController
