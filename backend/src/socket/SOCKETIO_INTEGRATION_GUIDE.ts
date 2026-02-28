/**
 * Socket.IO Integration Guide
 * Real-time Chat & Notifications
 */

// ============= SERVIDOR BACKEND (src/socket/socketio.ts) =============

import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger-advanced';

// Store de usuários online
const onlineUsers: Map<string, string> = new Map(); // userId -> socketId

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware para autenticação
  io.use((socket, next) => {
    const userId = socket.handshake.query.userId as string;

    if (!userId) {
      return next(new Error('userId obrigatório'));
    }

    socket.userId = userId;
    next();
  });

  // ===== EVENTOS DE CONEXÃO =====

  io.on('connection', (socket) => {
    const userId = socket.userId;

    logger.info(`✅ Usuário conectado: ${userId}`);

    // Registrar usuário online
    onlineUsers.set(userId, socket.id);

    // Notificar outros usuários que este está online
    io.emit('user_status_changed', {
      userId,
      status: 'online',
      timestamp: new Date(),
    });

    // ===== EVENTOS DE CHAT =====

    /**
     * Cliente envia mensagem para a conversa
     */
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, message, attachments } = data;

        logger.debug(`💬 Mensagem de ${userId} para ${recipientId}`);

        // Salvar no banco de dados
        const chatMessage = await saveChatMessage({
          senderId: userId,
          recipientId,
          message,
          attachments,
          createdAt: new Date(),
        });

        // Enviar para o destinatário se estiver online
        const recipientSocketId = onlineUsers.get(recipientId);

        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_message', {
            id: chatMessage.id,
            senderId: userId,
            message,
            attachments,
            createdAt: chatMessage.createdAt,
            read: false,
          });
        }

        // Confirmatório para remetente
        socket.emit('message_sent', {
          id: chatMessage.id,
          status: 'sent',
        });

        // Se recipient está offline, enviar notificação
        if (!recipientSocketId) {
          await sendEmailNotification(recipientId, {
            type: 'new_message',
            fromUser: userId,
            message: message.substring(0, 50) + '...',
          });
        }
      } catch (error) {
        logger.error('Erro ao enviar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    /**
     * Marcar mensagem como lida
     */
    socket.on('mark_as_read', async (data) => {
      const { messageId } = data;

      try {
        await markMessageAsRead(messageId);

        // Notificar remetente
        io.emit('message_read', { messageId });
      } catch (error) {
        logger.error('Erro ao marcar como lido:', error);
      }
    });

    /**
     * Indicador de digitação
     */
    socket.on('typing', (data) => {
      const { recipientId } = data;

      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          userId,
          typing: true,
        });
      }
    });

    /**
     * Parou de digitar
     */
    socket.on('stop_typing', (data) => {
      const { recipientId } = data;

      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          userId,
          typing: false,
        });
      }
    });

    // ===== EVENTOS DE AGENDAMENTO =====

    /**
     * Notificação em tempo real de novo agendamento
     */
    socket.on('new_booking_notification', (data) => {
      const { staffId, bookingId, serviceName } = data;

      const staffSocketId = onlineUsers.get(staffId);

      if (staffSocketId) {
        io.to(staffSocketId).emit('booking_assigned', {
          bookingId,
          serviceName,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Atualização de status de agendamento
     */
    socket.on('booking_status_update', (data) => {
      const { bookingId, customerId, status } = data;

      const customerSocketId = onlineUsers.get(customerId);

      if (customerSocketId) {
        io.to(customerSocketId).emit('booking_updated', {
          bookingId,
          status,
          timestamp: new Date(),
        });
      }
    });

    // ===== EVENTOS DE DESCONEXÃO =====

    socket.on('disconnect', () => {
      logger.info(`❌ Usuário desconectado: ${userId}`);

      onlineUsers.delete(userId);

      // Notificar outros que este está offline
      io.emit('user_status_changed', {
        userId,
        status: 'offline',
        timestamp: new Date(),
      });
    });

    socket.on('error', (error) => {
      logger.error(`Socket erro para ${userId}:`, error);
    });
  });

  return io;
};

// ============= FUNÇÕES AUXILIARES =============

async function saveChatMessage(data: any) {
  // Implementar salvar no banco de dados
  const { pool } = require('../database/db');

  const result = await pool.query(
    `INSERT INTO chat_messages (sender_id, recipient_id, message, attachments, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [data.senderId, data.recipientId, data.message, JSON.stringify(data.attachments || [])]
  );

  return result.rows[0];
}

async function markMessageAsRead(messageId: string) {
  const { pool } = require('../database/db');

  await pool.query(
    `UPDATE chat_messages SET read = true, read_at = NOW() WHERE id = $1`,
    [messageId]
  );
}

async function sendEmailNotification(userId: string, data: any) {
  // Implementar envio de email
  logger.info(`📧 Notificação enviada para ${userId}`);
}

// ============= CLIENTE FRONTEND (React) =============

// src/hooks/useSocket.ts

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (userId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Conectar ao socket servidor
    const socketIO = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      query: { userId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Eventos de conexão
    socketIO.on('connect', () => {
      console.log('✅ Socket conectado');
      setIsConnected(true);
    });

    socketIO.on('disconnect', () => {
      console.log('❌ Socket desconectado');
      setIsConnected(false);
    });

    // Atualizar lista de usuários online
    socketIO.on('user_status_changed', (data) => {
      if (data.status === 'online') {
        setOnlineUsers((prev) => [...new Set([...prev, data.userId])]);
      } else {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
      }
    });

    setSocket(socketIO);

    return () => {
      socketIO.disconnect();
    };
  }, [userId]);

  return { socket, isConnected, onlineUsers };
};

// ============= COMPONENTE DE CHAT =============

// src/components/ChatWindow.tsx

import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: string;
  senderId: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

interface ChatWindowProps {
  userId: string;
  staffId: string;
  staffName: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ userId, staffId, staffName }) => {
  const { socket, isConnected } = useSocket(userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [staffIsTyping, setStaffIsTyping] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Receber nova mensagem
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);

      // Marcar como lida
      socket.emit('mark_as_read', { messageId: data.id });
    });

    // Indicador de digitação
    socket.on('user_typing', (data) => {
      setStaffIsTyping(data.typing);
    });

    // Tratamento de erro
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('error');
    };
  }, [socket]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('send_message', {
      recipientId: staffId,
      message: newMessage,
    });

    // Adicionar à lista local
    setMessages((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        senderId: userId,
        message: newMessage,
        createdAt: new Date(),
        read: false,
      },
    ]);

    setNewMessage('');
    setIsTyping(false);

    socket.emit('stop_typing', { recipientId: staffId });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { recipientId: staffId });
    }
  };

  const handleStopTyping = () => {
    setIsTyping(false);
    socket?.emit('stop_typing', { recipientId: staffId });
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{staffName}</h3>
        <div className={`status ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}>
            <p>{msg.message}</p>
            <span className="timestamp">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
            {msg.read && <span className="read-badge">✓✓</span>}
          </div>
        ))}
      </div>

      {staffIsTyping && <div className="typing-indicator">Staff está digitando...</div>}

      <div className="input-area">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          onBlur={handleStopTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Digite sua mensagem..."
          disabled={!isConnected}
        />
        <button onClick={handleSendMessage} disabled={!isConnected || !newMessage.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
};

// ============= SETUP EXPRESS COM SOCKET.IO =============

// src/index.ts

import express from 'express';
import { createServer } from 'http';
import { initializeSocket } from './socket/socketio';

const app = express();
const httpServer = createServer(app);

// Inicializar Socket.IO
const io = initializeSocket(httpServer);

// Middleware
app.use(express.json());

// Rotas padrão
app.get('/', (req, res) => {
  res.json({ message: 'API Leidy Cleaner' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💬 Socket.IO ready on ws://localhost:${PORT}`);
});
