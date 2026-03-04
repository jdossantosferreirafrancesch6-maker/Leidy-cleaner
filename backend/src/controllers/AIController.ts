import { Response } from 'express';
import { AuthRequest, ApiError } from '../middleware/errorHandler';
import { AIService } from '../services/AIService';
import { logger } from '../utils/logger-advanced';
import { t } from '../utils/i18n';

const aiService = new AIService();

export class AIController {
  // Get service recommendations for a user
  async getServiceRecommendations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw ApiError(t('authenticationRequired'), 401);
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const recommendations = await aiService.recommendServices(userId, limit);

      res.json({
        message: t('serviceRecommendations'),
        data: { recommendations }
      });
    } catch (error) {
      logger.error('Error getting service recommendations:', error);
      throw ApiError(t('failedGetRecommendations'), 500);
    }
  }

  // Get staff recommendations for a service
  async getStaffRecommendations(req: AuthRequest, res: Response) {
    try {
      const { serviceId } = req.params;
      const { latitude, longitude, limit } = req.query;

      const recommendations = await aiService.recommendStaff(
        parseInt(serviceId as string),
        latitude ? parseFloat(latitude as string) : undefined,
        longitude ? parseFloat(longitude as string) : undefined,
        parseInt(limit as string) || 3
      );

      res.json({
        message: t('staffRecommendations'),
        data: { recommendations }
      });
    } catch (error) {
      logger.error('Error getting staff recommendations:', error);
      throw ApiError(t('failedGetStaffRecommendations'), 500);
    }
  }

  // Chatbot query processing
  async processChatbotQuery(req: AuthRequest, res: Response) {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        throw ApiError(t('queryRequired'), 400);
      }

      const response = await aiService.processChatbotQuery(query);

      res.json({
        message: t('chatbotResponse'),
        data: { response }
      });
    } catch (error) {
      logger.error('Error processing chatbot query:', error);
      throw ApiError(t('failedProcessQuery'), 500);
    }
  }

  // Get booking analytics
  async getBookingAnalytics(req: AuthRequest, res: Response) {
    try {
      // Only allow admin access
      if (req.user?.role !== 'admin') {
        throw ApiError(t('adminAccessRequired'), 403);
      }

      const analytics = await aiService.analyzeBookingPatterns();

      if (!analytics) {
        throw ApiError(t('failedGenerateAnalytics'), 500);
      }

      res.json({
        message: t('bookingAnalyticsRetrieved'),
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting booking analytics:', error);
      throw ApiError(t('failedGetAnalytics'), 500);
    }
  }
}