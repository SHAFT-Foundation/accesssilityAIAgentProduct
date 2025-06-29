import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createError } from './error-handler';
import { sessionManager, SessionData } from '../services/redis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

import { User } from '@prisma/client';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Verify JWT token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    throw createError('Access token required', 401);
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    throw createError('Invalid or expired token', 403);
  }
};

// Check subscription level
export const requireSubscription = (minimumLevel: 'free' | 'pro' | 'enterprise') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }
    
    const subscriptionLevels = {
      free: 0,
      pro: 1,
      enterprise: 2,
    };
    
    const userLevel = subscriptionLevels[(req.user as any).subscription.toLowerCase() as keyof typeof subscriptionLevels] || 0;
    const requiredLevel = subscriptionLevels[minimumLevel];
    
    if (userLevel < requiredLevel) {
      throw createError(`${minimumLevel} subscription required`, 403);
    }
    
    next();
  };
};

// Generate JWT token with session
export const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    subscription: user.subscription,
    stripeCustomerId: user.stripeCustomerId,
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
    issuer: 'accessibility-scanner',
    audience: 'accessibility-scanner-users',
  });
};

// Generate session token and store in Redis
export const generateSessionToken = async (
  user: User,
  req: Request
): Promise<{ token: string; sessionId: string }> => {
  const sessionId = crypto.randomUUID();
  
  // Create session data
  const sessionData: Omit<SessionData, 'createdAt' | 'lastActivity'> = {
    userId: user.id,
    email: user.email,
    name: user.name || undefined,
    subscription: user.subscription,
    provider: user.provider,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  // Store session in Redis
  const sessionCreated = await sessionManager.createSession(sessionId, sessionData);
  
  if (!sessionCreated) {
    throw createError('Failed to create session', 500);
  }

  // Generate JWT with session ID
  const payload = {
    id: user.id,
    email: user.email,
    sessionId,
    subscription: user.subscription,
    stripeCustomerId: user.stripeCustomerId,
  };
  
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: '30d', // Match Redis session expiry
    issuer: 'accessibility-scanner',
    audience: 'accessibility-scanner-users',
  });

  logger.info('Session token generated', {
    userId: user.id,
    sessionId,
    provider: user.provider,
  });

  return { token, sessionId };
};

// Middleware to authenticate with session validation
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    throw createError('Access token required', 401);
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Check if this is a session-based token
    if (decoded.sessionId) {
      // Validate session exists in Redis
      const sessionData = await sessionManager.getSession(decoded.sessionId);
      
      if (!sessionData) {
        throw createError('Session expired or invalid', 401);
      }
      
      // Check if session belongs to the token user
      if (sessionData.userId !== decoded.id) {
        throw createError('Session mismatch', 401);
      }
      
      // Extend session and update last activity (done automatically in getSession)
      // Set user data including session info
      req.user = {
        ...decoded,
        sessionData,
      } as any;
    } else {
      // Legacy JWT token without session
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError('Token expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw createError('Invalid token', 401);
    } else {
      throw error;
    }
  }
};

// Logout and destroy session
export const destroySession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (user?.sessionData || user?.sessionId) {
      const sessionId = user.sessionData?.sessionId || user.sessionId;
      
      if (sessionId) {
        const deleted = await sessionManager.deleteSession(sessionId);
        
        if (deleted) {
          logger.info('Session destroyed', { sessionId, userId: user.id });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error destroying session:', error);
    next(); // Continue even if session destruction fails
  }
};

// Destroy all user sessions (for security purposes)
export const destroyAllUserSessions = async (userId: string): Promise<boolean> => {
  try {
    const deleted = await sessionManager.deleteAllUserSessions(userId);
    
    if (deleted) {
      logger.info('All user sessions destroyed', { userId });
    }
    
    return deleted;
  } catch (error) {
    logger.error('Error destroying all user sessions:', error);
    return false;
  }
};

// Get user's active sessions
export const getUserActiveSessions = async (userId: string) => {
  try {
    const sessions = await sessionManager.getUserSessions(userId);
    
    // Format sessions for frontend display
    return sessions.map(({ sessionId, data }) => ({
      sessionId,
      createdAt: new Date(data.createdAt),
      lastActivity: new Date(data.lastActivity),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      provider: data.provider,
      current: false, // Will be set by frontend based on current session
    }));
  } catch (error) {
    logger.error('Error getting user sessions:', error);
    return [];
  }
};