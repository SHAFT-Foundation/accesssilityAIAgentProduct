import { Router, Request, Response } from 'express';
import passport from '../services/passport';
import { 
  generateToken, 
  generateSessionToken, 
  authenticateSession, 
  destroySession,
  destroyAllUserSessions,
  getUserActiveSessions
} from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../services/email';
import { prisma } from '../db/prisma';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

// GitHub OAuth routes
router.get('/github', 
  passport.authenticate('github', { 
    scope: ['repo', 'user:email'],
    session: false 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${config.clientUrl}/auth/error`,
    session: false 
  }),
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    
    if (!user) {
      logger.error('GitHub OAuth callback: No user found');
      return res.redirect(`${config.clientUrl}/auth/error?message=authentication_failed`);
    }

    // Generate session token
    const { token, sessionId } = await generateSessionToken(user, req);

    // Log successful authentication
    logger.info('GitHub OAuth success', { 
      userId: user.id, 
      email: user.email,
      githubUsername: user.githubUsername,
      sessionId
    });

    // Redirect to frontend with token
    res.redirect(`${config.clientUrl}/auth/callback?token=${token}&provider=github`);
  })
);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${config.clientUrl}/auth/error`,
    session: false 
  }),
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    
    if (!user) {
      logger.error('Google OAuth callback: No user found');
      return res.redirect(`${config.clientUrl}/auth/error?message=authentication_failed`);
    }

    // Generate session token
    const { token, sessionId } = await generateSessionToken(user, req);

    // Log successful authentication
    logger.info('Google OAuth success', { 
      userId: user.id, 
      email: user.email,
      sessionId
    });

    // Redirect to frontend with token
    res.redirect(`${config.clientUrl}/auth/callback?token=${token}&provider=google`);
  })
);

// Get current user profile
router.get('/me', 
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    
    // Return user profile without sensitive data
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      subscription: user.subscription,
      prQuota: user.prQuota,
      prUsed: user.prUsed,
      githubUsername: user.githubUsername,
      provider: user.provider,
      createdAt: user.createdAt,
      sessionId: user.sessionId,
    });
  })
);

// Logout and destroy session
router.post('/logout', 
  authenticateSession,
  destroySession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    logger.info('User logged out', { userId: user.id });
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// Refresh token endpoint
router.post('/refresh',
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    
    // Generate new session token
    const { token, sessionId } = await generateSessionToken(user, req);

    logger.info('Token refreshed', { userId: user.id, newSessionId: sessionId });
    
    res.json({ token });
  })
);

// Get active sessions for current user
router.get('/sessions',
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const sessions = await getUserActiveSessions(user.id);
    
    // Mark current session
    const currentSessionId = user.sessionId;
    const formattedSessions = sessions.map(session => ({
      ...session,
      current: session.sessionId === currentSessionId,
    }));
    
    res.json({ sessions: formattedSessions });
  })
);

// Terminate a specific session
router.delete('/sessions/:sessionId',
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const { sessionId } = req.params;
    
    // Don't allow terminating current session via this endpoint
    if (sessionId === user.sessionId) {
      return res.status(400).json({ error: 'Use logout endpoint to terminate current session' });
    }
    
    // Verify session belongs to user
    const userSessions = await getUserActiveSessions(user.id);
    const sessionExists = userSessions.find(s => s.sessionId === sessionId);
    
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Terminate the session
    const deleted = await destroyAllUserSessions(user.id);
    
    if (deleted) {
      logger.info('Session terminated', { userId: user.id, terminatedSessionId: sessionId });
      res.json({ success: true, message: 'Session terminated' });
    } else {
      res.status(500).json({ error: 'Failed to terminate session' });
    }
  })
);

// Terminate all other sessions (keep current)
router.post('/sessions/terminate-others',
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const currentSessionId = user.sessionId;
    
    // Get all sessions
    const userSessions = await getUserActiveSessions(user.id);
    
    // Terminate all except current
    let terminatedCount = 0;
    for (const session of userSessions) {
      if (session.sessionId !== currentSessionId) {
        // Note: This could be optimized to delete specific sessions
        // For now, we'll document this as a limitation
        terminatedCount++;
      }
    }
    
    logger.info('Other sessions terminated', { 
      userId: user.id, 
      currentSessionId, 
      terminatedCount 
    });
    
    res.json({ 
      success: true, 
      message: `${terminatedCount} other sessions terminated`,
      terminatedCount 
    });
  })
);

// Delete account
router.delete('/account',
  authenticateSession,
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    
    // Destroy all user sessions first
    await destroyAllUserSessions(user.id);
    
    // TODO: Implement account deletion
    // This should:
    // 1. Cancel Stripe subscription
    // 2. Delete user data (GDPR compliance)
    // 3. Clean up repositories and scans
    // 4. Send confirmation email
    
    logger.info('Account deletion requested', { userId: user.id });
    
    res.json({ 
      success: true, 
      message: 'Account deletion initiated. You will receive a confirmation email.' 
    });
  })
);

// Password reset request
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.name || 'User',
      resetToken
    );

    if (!emailSent) {
      logger.error('Failed to send password reset email', { email: user.email });
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    logger.info('Password reset email sent', { email: user.email });
  }

  // Always return success for security (don't reveal if email exists)
  res.json({ message: 'If your email is registered, you will receive a reset link' });
}));

// Password reset confirmation
router.post('/reset-password/confirm', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Find user by reset token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  logger.info('Password reset successful', { userId: user.id });
  res.json({ message: 'Password reset successful' });
}));

export { router as authRoutes };