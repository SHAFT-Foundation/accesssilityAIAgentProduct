import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SessionData {
  userId: string;
  email: string;
  name?: string;
  subscription: string;
  provider: string;
  createdAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
}

// Redis client for general use
export const redis = new Redis(config.redisUrl, {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  reconnectOnError: (err) => {
    logger.error('Redis reconnect on error', err);
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
});

// Redis client for Bull queue
export const queueRedis = new Redis(config.redisUrl, {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Connection event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

queueRedis.on('connect', () => {
  logger.info('Queue Redis connected');
});

queueRedis.on('error', (err) => {
  logger.error('Queue Redis error:', err);
});

// Session management
class SessionManager {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

  /**
   * Create a new user session
   */
  async createSession(
    sessionId: string,
    sessionData: Omit<SessionData, 'createdAt' | 'lastActivity'>
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const fullSessionData: SessionData = {
        ...sessionData,
        createdAt: now,
        lastActivity: now,
      };

      // Store session data
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redis.setex(
        sessionKey,
        this.SESSION_EXPIRY,
        JSON.stringify(fullSessionData)
      );

      // Track user sessions for multi-session management
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${sessionData.userId}`;
      await redis.sadd(userSessionsKey, sessionId);
      await redis.expire(userSessionsKey, this.SESSION_EXPIRY);

      logger.info('Session created', {
        sessionId,
        userId: sessionData.userId,
        provider: sessionData.provider,
      });

      return true;
    } catch (error) {
      logger.error('Failed to create session:', error);
      return false;
    }
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = await redis.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      const parsed: SessionData = JSON.parse(sessionData);
      
      // Update last activity timestamp
      parsed.lastActivity = Date.now();
      await redis.setex(sessionKey, this.SESSION_EXPIRY, JSON.stringify(parsed));

      return parsed;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const existingData = await redis.get(sessionKey);

      if (!existingData) {
        return false;
      }

      const sessionData: SessionData = JSON.parse(existingData);
      const updatedData: SessionData = {
        ...sessionData,
        ...updates,
        lastActivity: Date.now(),
      };

      await redis.setex(
        sessionKey,
        this.SESSION_EXPIRY,
        JSON.stringify(updatedData)
      );

      return true;
    } catch (error) {
      logger.error('Failed to update session:', error);
      return false;
    }
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      
      // Get session data to identify user
      const sessionData = await redis.get(sessionKey);
      if (sessionData) {
        const parsed: SessionData = JSON.parse(sessionData);
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${parsed.userId}`;
        await redis.srem(userSessionsKey, sessionId);
      }

      // Delete the session
      const deleted = await redis.del(sessionKey);
      
      logger.info('Session deleted', { sessionId });
      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<boolean> {
    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return true;
      }

      // Delete all session keys
      const sessionKeys = sessionIds.map(id => `${this.SESSION_PREFIX}${id}`);
      await redis.del(...sessionKeys);

      // Delete user sessions set
      await redis.del(userSessionsKey);

      logger.info('All user sessions deleted', { userId, count: sessionIds.length });
      return true;
    } catch (error) {
      logger.error('Failed to delete all user sessions:', error);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{ sessionId: string; data: SessionData }>> {
    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);

      const sessions: Array<{ sessionId: string; data: SessionData }> = [];

      for (const sessionId of sessionIds) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const sessionData = await redis.get(sessionKey);
        
        if (sessionData) {
          sessions.push({
            sessionId,
            data: JSON.parse(sessionData),
          });
        } else {
          // Clean up stale session reference
          await redis.srem(userSessionsKey, sessionId);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const extended = await redis.expire(sessionKey, this.SESSION_EXPIRY);
      
      if (extended) {
        // Also update last activity
        await this.updateSession(sessionId, {});
      }
      
      return extended === 1;
    } catch (error) {
      logger.error('Failed to extend session:', error);
      return false;
    }
  }

  /**
   * Check if session exists and is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const exists = await redis.exists(sessionKey);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check session validity:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      const sessionKeys = await redis.keys(pattern);
      let cleanedCount = 0;

      // Check each session and remove from user_sessions if expired
      for (const sessionKey of sessionKeys) {
        const exists = await redis.exists(sessionKey);
        if (exists === 0) {
          // Session expired, extract sessionId and clean up references
          const sessionId = sessionKey.replace(this.SESSION_PREFIX, '');
          const userSessionsPattern = `${this.USER_SESSIONS_PREFIX}*`;
          const userSessionsKeys = await redis.keys(userSessionsPattern);
          
          for (const userKey of userSessionsKeys) {
            await redis.srem(userKey, sessionId);
          }
          
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired sessions', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}

// Export session manager instance
export const sessionManager = new SessionManager();

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnections(): Promise<void> {
  try {
    await Promise.all([
      redis.disconnect(),
      queueRedis.disconnect()
    ]);
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections', error);
  }
}

// Export types
export type { SessionData };