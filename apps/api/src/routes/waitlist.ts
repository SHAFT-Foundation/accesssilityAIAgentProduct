import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting - 5 requests per 15 minutes per IP
const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many waitlist requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/waitlist - Join waitlist
router.post('/', waitlistLimiter, async (req, res) => {
  try {
    const { email, source, metadata } = waitlistSchema.parse(req.body);

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingEntry) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'This email is already on our waitlist.',
      });
    }

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        source: source || 'unknown',
        metadata: metadata || {},
      },
    });

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist!',
      id: waitlistEntry.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      });
    }

    console.error('Waitlist signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to join waitlist. Please try again.',
    });
  }
});

// GET /api/waitlist/count - Get waitlist count (public)
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.waitlist.count();
    res.json({ count });
  } catch (error) {
    console.error('Waitlist count error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get waitlist count.',
    });
  }
});

export default router;