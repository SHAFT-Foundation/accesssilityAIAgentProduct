import { PrismaClient, User, SubscriptionType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateUserInput {
  email: string;
  name?: string;
  avatarUrl?: string;
  githubId?: string;
  githubUsername?: string;
  githubAccessToken?: string;
  googleId?: string;
  googleAccessToken?: string;
  provider?: string;
  subscription?: SubscriptionType;
}

export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string;
  githubId?: string;
  githubUsername?: string;
  githubAccessToken?: string;
  googleId?: string;
  googleAccessToken?: string;
  provider?: string;
  subscription?: SubscriptionType;
  stripeCustomerId?: string;
  prQuota?: number;
  prUsed?: number;
  lastQuotaReset?: Date;
}

// Create a new user
export async function createUser(data: CreateUserInput): Promise<User> {
  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        githubId: data.githubId,
        githubUsername: data.githubUsername,
        githubAccessToken: data.githubAccessToken,
        googleId: data.googleId,
        googleAccessToken: data.googleAccessToken,
        provider: data.provider || 'email',
        subscription: data.subscription || 'FREE',
      },
    });

    logger.info('User created', { userId: user.id, email: user.email, provider: user.provider });
    return user;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        repositories: true,
        subscriptions: true,
      },
    });
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw error;
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        repositories: true,
        subscriptions: true,
      },
    });
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
}

// Find user by GitHub ID
export async function findUserByGitHubId(githubId: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { githubId },
      include: {
        repositories: true,
        subscriptions: true,
      },
    });
  } catch (error) {
    logger.error('Error finding user by GitHub ID:', error);
    throw error;
  }
}

// Find user by Google ID
export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { googleId },
      include: {
        repositories: true,
        subscriptions: true,
      },
    });
  } catch (error) {
    logger.error('Error finding user by Google ID:', error);
    throw error;
  }
}

// Update user
export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        repositories: true,
        subscriptions: true,
      },
    });

    logger.info('User updated', { userId: user.id, email: user.email });
    return user;
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  try {
    await prisma.user.delete({
      where: { id },
    });

    logger.info('User deleted', { userId: id });
  } catch (error) {
    logger.error('Error deleting user:', error);
    throw error;
  }
}

// Check if user has exceeded PR quota
export async function checkPRQuota(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        prQuota: true,
        prUsed: true,
        lastQuotaReset: true,
        subscription: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if quota should be reset (monthly)
    const now = new Date();
    const lastReset = new Date(user.lastQuotaReset);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReset >= 30) {
      // Reset quota
      await prisma.user.update({
        where: { id: userId },
        data: {
          prUsed: 0,
          lastQuotaReset: now,
        },
      });
      return true; // Can create PR
    }

    // For PRO users, no quota limit
    if (user.subscription === 'PRO' || user.subscription === 'ENTERPRISE') {
      return true;
    }

    // Check if user has exceeded quota
    return user.prUsed < user.prQuota;
  } catch (error) {
    logger.error('Error checking PR quota:', error);
    throw error;
  }
}

// Increment PR usage
export async function incrementPRUsage(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        prUsed: {
          increment: 1,
        },
      },
    });

    logger.info('PR usage incremented', { userId });
  } catch (error) {
    logger.error('Error incrementing PR usage:', error);
    throw error;
  }
}

// Get user stats
export async function getUserStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        repositories: true,
        scans: {
          where: {
            status: 'COMPLETED',
          },
        },
        _count: {
          select: {
            repositories: true,
            scans: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const totalIssuesFixed = await prisma.issue.count({
      where: {
        scan: {
          userId: userId,
        },
        status: 'RESOLVED',
      },
    });

    const totalPRsCreated = await prisma.pullRequest.count({
      where: {
        repository: {
          userId: userId,
        },
      },
    });

    return {
      repositories: user._count.repositories,
      scansCompleted: user._count.scans,
      issuesFixed: totalIssuesFixed,
      prsCreated: totalPRsCreated,
      prQuotaUsed: user.prUsed,
      prQuotaLimit: user.prQuota,
      subscription: user.subscription,
    };
  } catch (error) {
    logger.error('Error getting user stats:', error);
    throw error;
  }
}