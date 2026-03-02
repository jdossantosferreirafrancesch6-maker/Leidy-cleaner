import { query } from '../utils/database';
import { logger } from '../utils/logger-advanced';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'customer' | 'staff' | 'admin';
  message: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  bookingId: string;
  customerId: string;
  staffId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export class ChatService {
  /**
   * Cria ou obtém uma sala de chat para um booking
   */
  static async getOrCreateChatRoom(bookingId: string): Promise<ChatRoom | null> {
    try {
      // Verificar se já existe
      const existing = await query(
        `SELECT cr.*, b.user_id as customer_id, b.team_member_id as staff_id
         FROM chat_rooms cr
         JOIN bookings b ON b.id = cr.booking_id
         WHERE cr.booking_id = $1`,
        [bookingId]
      );

      if (existing.length > 0) {
        return existing[0];
      }

      // Criar nova sala
      const booking = await query(
        'SELECT user_id, team_member_id FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (booking.length === 0) {
        throw new Error('Booking not found');
      }

      const result = await query(
        `INSERT INTO chat_rooms (booking_id, customer_id, staff_id, unread_count, created_at, updated_at)
         VALUES ($1, $2, $3, 0, ${require('../utils/sql').sqlNow()}, ${require('../utils/sql').sqlNow()}) RETURNING *`, 
        [bookingId, booking[0].user_id, booking[0].team_member_id]
      );

      return result[0];
    } catch (error) {
      logger.error('Error creating/getting chat room:', error);
      return null;
    }
  }

  /**
   * Salva uma mensagem no chat
   */
  static async saveMessage(
    bookingId: string,
    senderId: string,
    senderRole: 'customer' | 'staff' | 'admin',
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string
  ): Promise<ChatMessage | null> {
    try {
      const result = await query(
        `INSERT INTO chat_messages (booking_id, sender_id, sender_role, message, message_type, file_url, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, ${require('../utils/sql').sqlNow()}) RETURNING *`, 
        [bookingId, senderId, senderRole, message, messageType, fileUrl]
      );

      // Atualizar último mensagem na sala
      await query(
        `UPDATE chat_rooms
         SET last_message = $1, last_message_at = ${require('../utils/sql').sqlNow()}, updated_at = ${require('../utils/sql').sqlNow()},
             unread_count = unread_count + 1
         WHERE booking_id = $2`,
        [message.substring(0, 100), bookingId] // Limitar tamanho da preview
      );

      return result[0];
    } catch (error) {
      logger.error('Error saving chat message:', error);
      return null;
    }
  }

  /**
   * Obtém mensagens de um chat
   */
  static async getMessages(bookingId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const result = await query(
        `SELECT * FROM chat_messages
         WHERE booking_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [bookingId, limit, offset]
      );

      return result.reverse(); // Retornar em ordem cronológica
    } catch (error) {
      logger.error('Error getting chat messages:', error);
      return [];
    }
  }

  /**
   * Marca mensagens como lidas
   */
  static async markAsRead(bookingId: string, userId: string): Promise<void> {
    try {
      await query(
        `UPDATE chat_messages
         SET is_read = true
         WHERE booking_id = $1 AND sender_id != $2`,
        [bookingId, userId]
      );

      // Resetar contador de não lidas
      await query(
        'UPDATE chat_rooms SET unread_count = 0 WHERE booking_id = $1',
        [bookingId]
      );
    } catch (error) {
      logger.error('Error marking messages as read:', error);
    }
  }

  /**
   * Obtém salas de chat do usuário
   */
  static async getUserChatRooms(userId: string, userRole: string): Promise<ChatRoom[]> {
    try {
      let sql: string;
      let params: any[];

      if (userRole === 'admin') {
        // Admin vê todas as salas
        sql = 'SELECT * FROM chat_rooms ORDER BY updated_at DESC';
        params = [];
      } else if (userRole === 'staff') {
        // Staff vê salas onde é atribuído
        sql = 'SELECT * FROM chat_rooms WHERE staff_id = $1 ORDER BY updated_at DESC';
        params = [userId];
      } else {
        // Cliente vê suas próprias salas
        sql = 'SELECT * FROM chat_rooms WHERE customer_id = $1 ORDER BY updated_at DESC';
        params = [userId];
      }

      const result = await query(sql, params);
      return result;
    } catch (error) {
      logger.error('Error getting user chat rooms:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas do chat
   */
  static async getStats(): Promise<{ totalRooms: number; totalMessages: number; activeChats: number }> {
    try {
      const roomsResult = await query('SELECT COUNT(*) as count FROM chat_rooms');
      const messagesResult = await query('SELECT COUNT(*) as count FROM chat_messages');
      const activeResult = await query(
        `SELECT COUNT(*) as count FROM chat_rooms WHERE updated_at > ${require('../utils/sql').sqlAgoHours(24)}`
      );

      return {
        totalRooms: parseInt(roomsResult[0].count),
        totalMessages: parseInt(messagesResult[0].count),
        activeChats: parseInt(activeResult[0].count)
      };
    } catch (error) {
      logger.error('Error getting chat stats:', error);
      return { totalRooms: 0, totalMessages: 0, activeChats: 0 };
    }
  }
}