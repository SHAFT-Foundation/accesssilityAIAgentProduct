import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // Redis
  redisUrl: process.env.REDIS_URL!,
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  
  // GitHub
  githubAppId: process.env.GITHUB_APP_ID!,
  githubPrivateKey: process.env.GITHUB_PRIVATE_KEY!,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY!,
  
  // Security
  jwtSecret: process.env.JWT_SECRET!,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Sentry
  sentryDsn: process.env.SENTRY_DSN,
  
  // Email
  emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
  'JWT_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}