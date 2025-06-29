import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { sessionManager } from './redis';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

class SocketService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  initialize(server: HttpServer): SocketServer {
    this.io = new SocketServer(server, {
      cors: {
        origin: config.allowedOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('Socket.IO server initialized');
    return this.io;
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        
        // Check if this is a session-based token
        if (decoded.sessionId) {
          // Validate session exists in Redis
          const sessionData = await sessionManager.getSession(decoded.sessionId);
          
          if (!sessionData) {
            return next(new Error('Session expired or invalid'));
          }
          
          // Check if session belongs to the token user
          if (sessionData.userId !== decoded.id) {
            return next(new Error('Session mismatch'));
          }
          
          socket.userId = decoded.id;
          socket.sessionId = decoded.sessionId;
        } else {
          // Legacy JWT token without session
          socket.userId = decoded.id;
        }

        logger.info('Socket authenticated', {
          socketId: socket.id,
          userId: socket.userId,
          sessionId: socket.sessionId,
        });

        next();
      } catch (error) {
        logger.warn('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    
    // Track user connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Join user-specific room
    socket.join(`user:${userId}`);

    logger.info('Socket connected', {
      socketId: socket.id,
      userId,
      totalConnections: this.userSockets.get(userId)!.size,
    });

    // Handle events
    socket.on('join_repository', (repositoryId: string) => {
      this.handleJoinRepository(socket, repositoryId);
    });

    socket.on('leave_repository', (repositoryId: string) => {
      this.handleLeaveRepository(socket, repositoryId);
    });

    socket.on('join_scan', (scanId: string) => {
      this.handleJoinScan(socket, scanId);
    });

    socket.on('leave_scan', (scanId: string) => {
      this.handleLeaveScan(socket, scanId);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: Date.now(),
    });
  }

  private handleJoinRepository(socket: AuthenticatedSocket, repositoryId: string): void {
    socket.join(`repository:${repositoryId}`);
    logger.debug('Socket joined repository room', {
      socketId: socket.id,
      userId: socket.userId,
      repositoryId,
    });
  }

  private handleLeaveRepository(socket: AuthenticatedSocket, repositoryId: string): void {
    socket.leave(`repository:${repositoryId}`);
    logger.debug('Socket left repository room', {
      socketId: socket.id,
      userId: socket.userId,
      repositoryId,
    });
  }

  private handleJoinScan(socket: AuthenticatedSocket, scanId: string): void {
    socket.join(`scan:${scanId}`);
    logger.debug('Socket joined scan room', {
      socketId: socket.id,
      userId: socket.userId,
      scanId,
    });
  }

  private handleLeaveScan(socket: AuthenticatedSocket, scanId: string): void {
    socket.leave(`scan:${scanId}`);
    logger.debug('Socket left scan room', {
      socketId: socket.id,
      userId: socket.userId,
      scanId,
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const userId = socket.userId!;
    
    // Remove from tracking
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(socket.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socket.id);

    logger.info('Socket disconnected', {
      socketId: socket.id,
      userId,
      reason,
      remainingConnections: this.userSockets.get(userId)?.size || 0,
    });
  }

  // Public methods for emitting events

  /**
   * Send event to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit(event, data);
    
    logger.debug('Event emitted to user', {
      userId,
      event,
      hasConnections: this.userSockets.has(userId),
    });
  }

  /**
   * Send event to all users in a repository
   */
  emitToRepository(repositoryId: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(`repository:${repositoryId}`).emit(event, data);
    
    logger.debug('Event emitted to repository', {
      repositoryId,
      event,
    });
  }

  /**
   * Send event to all users following a scan
   */
  emitToScan(scanId: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(`scan:${scanId}`).emit(event, data);
    
    logger.debug('Event emitted to scan', {
      scanId,
      event,
    });
  }

  /**
   * Broadcast event to all connected users
   */
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    
    this.io.emit(event, data);
    
    logger.debug('Event broadcasted', { event });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectedUsers: number;
    userConnections: Record<string, number>;
  } {
    const userConnections: Record<string, number> = {};
    let totalConnections = 0;

    for (const [userId, sockets] of this.userSockets.entries()) {
      userConnections[userId] = sockets.size;
      totalConnections += sockets.size;
    }

    return {
      totalConnections,
      connectedUsers: this.userSockets.size,
      userConnections,
    };
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get connected users count for a room
   */
  getRoomSize(room: string): number {
    if (!this.io) return 0;
    
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  /**
   * Disconnect all sockets for a user (for security)
   */
  disconnectUser(userId: string, reason = 'Security disconnect'): void {
    if (!this.io || !this.userSockets.has(userId)) return;

    const socketIds = Array.from(this.userSockets.get(userId)!);
    
    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }

    logger.info('User disconnected by server', {
      userId,
      reason,
      socketsDisconnected: socketIds.length,
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Event constants for type safety
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  
  // Scan events
  SCAN_STARTED: 'scan_started',
  SCAN_PROGRESS: 'scan_progress',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_FAILED: 'scan_failed',
  SCAN_CANCELLED: 'scan_cancelled',
  
  // Issue events
  ISSUE_CREATED: 'issue_created',
  ISSUE_UPDATED: 'issue_updated',
  ISSUE_RESOLVED: 'issue_resolved',
  
  // Pull request events
  PR_CREATED: 'pr_created',
  PR_UPDATED: 'pr_updated',
  PR_MERGED: 'pr_merged',
  PR_CLOSED: 'pr_closed',
  
  // Repository events
  REPOSITORY_UPDATED: 'repository_updated',
  REPOSITORY_SYNCED: 'repository_synced',
  
  // System events
  SYSTEM_NOTIFICATION: 'system_notification',
  QUOTA_WARNING: 'quota_warning',
  QUOTA_EXCEEDED: 'quota_exceeded',
  
  // Real-time analytics
  ANALYTICS_UPDATE: 'analytics_update',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];