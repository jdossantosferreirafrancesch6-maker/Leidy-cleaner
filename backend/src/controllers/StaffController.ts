import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { StaffService } from '../services/StaffService';
import { profileUpdateSchema, availabilityArraySchema } from '../utils/schemas';
import { camelize } from '../utils/transformers';
import { t } from '../utils/i18n';

export class StaffController {
  static list = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const staff = await StaffService.listStaff();
    res.status(200).json({ message: t('staffRetrieved'), data: { staff: camelize(staff) } });
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const staff = await StaffService.getById(id);
    if (!staff) {
      throw ApiError(t('staffNotFound'), 404);
    }
    res.status(200).json({ message: t('staffRetrieved'), data: { staff: camelize(staff) } });
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    // only the staff themselves or admin may update
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      throw ApiError(t('notAuthorizedUpdateProfile'), 403);
    }
    const { error, value } = profileUpdateSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      throw ApiError(error.details[0].message, 400);
    }
    const updated = await StaffService.updateProfile(id, value);
    if (!updated) {
      throw ApiError(t('staffNotFound'), 404);
    }
    res.status(200).json({ message: t('profileUpdated'), data: { staff: camelize(updated) } });
  });

  static getAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const slots = await StaffService.getAvailability(id);
    res.status(200).json({ message: t('availabilityFetched'), data: { availability: camelize(slots) } });
  });

  static setAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      throw ApiError(t('notAuthorized'), 403);
    }
    const { error, value } = availabilityArraySchema.validate(req.body);
    if (error) {
      throw ApiError(error.details[0].message, 400);
    }
    const slots = await StaffService.setAvailability(id, value);
    res.status(200).json({ message: t('availabilityUpdated'), data: { availability: camelize(slots) } });
  });

  static getReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const reviews = await StaffService.getReviewsForStaff(id);
    res.status(200).json({ message: t('reviewsRetrieved'), data: { reviews: camelize(reviews) } });
  });

  static getRating = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const avg = await StaffService.getAverageRating(id);
    res.status(200).json({ message: t('ratingRetrieved'), data: { rating: avg } });
  });
}

export default StaffController
