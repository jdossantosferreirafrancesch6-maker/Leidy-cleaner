import { Response } from 'express';
import { AuthRequest, asyncHandler, ApiError } from '../middleware/errorHandler';
import { ChatService } from '../services/ChatService';
import { chatMessageSchema } from '../utils/schemas';
import { camelize } from '../utils/transformers';
import { t } from '../utils/i18n';

export class ChatController {
  /**
   * Obtém ou cria uma sala de chat para um booking
   */
  static getRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params as { bookingId: string };

    // Verificar se o usuário tem acesso ao booking
    const { BookingService } = await import('../services/BookingService');
    const booking = await BookingService.getById(bookingId);

    if (!booking) {
      throw ApiError(t('bookingNotFound'), 404);
    }

    // Verificar permissões
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (
      userRole !== 'admin' &&
      booking.user_id !== userId &&
      booking.team_member_id !== userId
    ) {
      throw ApiError(t('notAuthorizedToAccessChat'), 403);
    }

    const room = await ChatService.getOrCreateChatRoom(bookingId);
    if (!room) {
      throw ApiError(t('failedCreateChatRoom'), 500);
    }

    res.status(200).json({
      message: t('chatRoomRetrieved'),
      data: { room: camelize(room) }
    });
  });

  /**
   * Envia uma mensagem no chat
   */
  static sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params as { bookingId: string };
    const { error, value } = chatMessageSchema.validate(req.body);

    if (error) {
      throw ApiError(error.details[0].message, 400);
    }

    // Verificar se o usuário tem acesso ao booking
    const { BookingService } = await import('../services/BookingService');
    const booking = await BookingService.getById(bookingId);

    if (!booking) {
      throw ApiError(t('bookingNotFound'), 404);
    }

    // Verificar permissões
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (
      userRole !== 'admin' &&
      booking.user_id !== userId &&
      booking.team_member_id !== userId
    ) {
      throw ApiError(t('notAuthorizedToSendMessages'), 403);
    }

    // Determinar o role do sender
    let senderRole: 'customer' | 'staff' | 'admin' = 'customer';
    if (userRole === 'admin') {
      senderRole = 'admin';
    } else if (booking.team_member_id === userId) {
      senderRole = 'staff';
    }

    const savedMessage = await ChatService.saveMessage(
      bookingId,
      userId,
      senderRole,
      value.message,
      value.messageType || 'text',
      value.fileUrl
    );

    if (!savedMessage) {
      throw ApiError(t('failedSaveMessage'), 500);
    }

    res.status(201).json({
      message: t('messageSent'),
      data: { message: camelize(savedMessage) }
    });
  });

  /**
   * Obtém mensagens do chat
   */
  static getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params as { bookingId: string };
    const { limit = 50, offset = 0 } = req.query as { limit?: string; offset?: string };

    // Verificar se o usuário tem acesso ao booking
    const { BookingService } = await import('../services/BookingService');
    const booking = await BookingService.getById(bookingId);

    if (!booking) {
      throw ApiError(t('bookingNotFound'), 404);
    }

    // Verificar permissões
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (
      userRole !== 'admin' &&
      booking.user_id !== userId &&
      booking.team_member_id !== userId
    ) {
      throw ApiError(t('notAuthorizedToViewChat'), 403);
    }

    const messages = await ChatService.getMessages(
      bookingId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      message: t('messagesRetrieved'),
      data: { messages: camelize(messages) }
    });
  });

  /**
   * Marca mensagens como lidas
   */
  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params as { bookingId: string };

    // Verificar se o usuário tem acesso ao booking
    const { BookingService } = await import('../services/BookingService');
    const booking = await BookingService.getById(bookingId);

    if (!booking) {
      throw ApiError(t('bookingNotFound'), 404);
    }

    // Verificar permissões
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (
      userRole !== 'admin' &&
      booking.user_id !== userId &&
      booking.team_member_id !== userId
    ) {
      throw ApiError(t('notAuthorizedToMarkMessagesRead'), 403);
    }

    await ChatService.markAsRead(bookingId, userId);

    res.status(200).json({
      message: t('messagesMarkedRead')
    });
  });

  /**
   * Obtém salas de chat do usuário
   */
  static getUserRooms = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const rooms = await ChatService.getUserChatRooms(userId, userRole);

    res.status(200).json({
      message: t('chatRoomsRetrieved'),
      data: { rooms: camelize(rooms) }
    });
  });

  /**
   * Obtém estatísticas do chat (admin only)
   */
  static getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'admin') {
      throw ApiError(t('onlyAdminsViewChatStats'), 403);
    }

    const stats = await ChatService.getStats();

    res.status(200).json({
      message: t('chatStatsRetrieved'),
      data: { stats }
    });
  });
}

export default ChatController
