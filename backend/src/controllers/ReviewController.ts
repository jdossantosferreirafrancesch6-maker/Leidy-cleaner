import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { ReviewService } from '../services/ReviewService';
import { reviewSchema } from '../utils/schemas';
import { camelize } from '../utils/transformers';
import { t } from '../utils/i18n';

export class ReviewController {
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    const userId = req.user!.id;

    // ensure booking exists and belongs to user (unless admin)
    const { BookingService } = await import('../services/BookingService');
    const booking = await BookingService.getById(value.bookingId);
    if (!booking) {
      throw ApiError(t('serviceNotFound') || 'Booking not found', 404);
    }

    if (req.user!.role !== 'admin' && booking.user_id !== userId) {
      throw ApiError(t('cannotReviewOtherBooking') || 'Cannot review another user\'s booking', 403);
    }

    const review = await ReviewService.createReview(
      userId,
      value.bookingId,
      value.rating,
      value.comment,
      value.images
    );

    res.status(201).json({ message: t('reviewCreated'), data: { review: camelize(review) } });
  });

  static getByBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params as { bookingId: string };

    const reviews = await ReviewService.getByBooking(bookingId);

    // if not admin, ensure user owns booking
    if (req.user!.role !== 'admin') {
      const { BookingService } = await import('../services/BookingService');
      const bookingData = await BookingService.getById(bookingId);
      if (!bookingData || bookingData.user_id !== req.user!.id) {
        throw ApiError(t('notAuthorized') || 'Not authorized', 403);
      }
    }

    res.status(200).json({ message: t('reviewsFetched'), data: { reviews: camelize(reviews) } });
  });

  static getPublic = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.query as { serviceId?: string };
    const reviews = await ReviewService.getPublic(serviceId);
    res.status(200).json({ message: t('publicReviews'), data: { reviews: camelize(reviews) } });
  });

  static listAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'admin') {
      throw ApiError(t('adminsOnly') || 'Only admins can view all reviews', 403);
    }
    const reviews = await ReviewService.getAll();
    res.status(200).json({ message: t('allReviews') || 'All reviews', data: { reviews: camelize(reviews) } });
  });

  static approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'admin') {
      throw ApiError(t('adminsOnly') || 'Only admins can approve', 403);
    }
    const { id } = req.params as { id: string };
    const review = await ReviewService.approve(id);
    if (!review) {
      throw ApiError(t('reviewNotFound'), 404);
    }
    res.status(200).json({ message: t('reviewApproved'), data: { review: camelize(review) } });
  });

  static uploadImages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw ApiError(t('noFilesUploaded') || 'No files uploaded', 400);
    }

    const review = await ReviewService.getById(id);
    if (!review) {
      throw ApiError(t('reviewNotFound'), 404);
    }

    // only owner or admin
    if (req.user!.role !== 'admin' && review.user_id !== req.user!.id) {
      throw ApiError(t('notAuthorized'), 403);
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const urls = files.map(f => `${baseUrl}/uploads/reviews/${f.filename}`);
    const updated = await ReviewService.addImages(id, urls);

    res.status(200).json({ message: t('imagesUploaded'), data: { review: camelize(updated) } });
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    if (req.user!.role !== 'admin') {
      throw ApiError(t('adminsOnly'), 403);
    }
    await ReviewService.delete(id);
    res.status(200).json({ message: t('reviewDeleted') });
  });
}
