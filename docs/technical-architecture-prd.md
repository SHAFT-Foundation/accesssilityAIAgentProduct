# Technical Architecture & Product Requirements Document
## Shaft Accessibility AI Agent Platform

### Executive Summary
This document outlines the complete technical architecture and implementation requirements for the Shaft Accessibility AI Agent Platform. The system consists of a Next.js 15 application with Supabase backend, deployed on Vercel, with comprehensive monitoring and analytics integration.

### Current Status
- ✅ Landing page functional and deployed on Vercel
- ✅ Basic waitlist functionality with Supabase integration  
- ⚠️ Limited test coverage (only Playwright E2E test for waitlist)
- ⚠️ No unit or integration tests
- ⚠️ Missing API key management for production services

## 1. System Architecture

### 1.1 Technology Stack
```
Frontend:
- Next.js 15.3.4 (App Router)
- React 18.3.1
- TypeScript 5.0
- Tailwind CSS 3.4.17
- Lucide Icons

Backend:
- Supabase (PostgreSQL)
- Next.js API Routes
- Edge Runtime Compatible

Deployment:
- Vercel (Primary)
- Docker support for self-hosting

Monitoring & Analytics:
- Sentry (Error Tracking)
- Google Analytics 4
- Google Tag Manager
- Facebook Pixel
- LinkedIn Insight Tag
```

### 1.2 Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js App    │────▶│  API Routes     │────▶│   Supabase      │
│  (Vercel Edge)  │     │  (Serverless)   │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Analytics     │     │    Monitoring   │     │  External APIs  │
│  GA4/GTM/FB/LI  │     │     Sentry      │     │  (Future)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. API Integrations & Environment Variables

### 2.1 Required Environment Variables
```bash
# Supabase (Currently Hardcoded - Need to Externalize)
NEXT_PUBLIC_SUPABASE_URL=https://uyvlawgxlzddsoikmmjm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=[REQUIRED - NOT SET]

# Analytics (All Optional but Recommended)
NEXT_PUBLIC_GA_MEASUREMENT_ID=[REQUIRED]
NEXT_PUBLIC_GTM_ID=[OPTIONAL]
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=[OPTIONAL]
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=[OPTIONAL]

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=[REQUIRED]
SENTRY_AUTH_TOKEN=[REQUIRED FOR SOURCE MAPS]
SENTRY_ORG=[REQUIRED]
SENTRY_PROJECT=[REQUIRED]

# Application
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# Future Integrations
GITHUB_APP_ID=[FUTURE]
GITHUB_APP_PRIVATE_KEY=[FUTURE]
GITHUB_CLIENT_ID=[FUTURE]
GITHUB_CLIENT_SECRET=[FUTURE]
OPENAI_API_KEY=[FUTURE]
STRIPE_SECRET_KEY=[FUTURE]
STRIPE_WEBHOOK_SECRET=[FUTURE]
SENDGRID_API_KEY=[FUTURE]
```

### 2.2 API Integration Status
| Service | Status | Purpose | Priority |
|---------|--------|---------|----------|
| Supabase | ✅ Active | Database & Auth | Critical |
| Google Analytics | ⚠️ Keys Missing | User Analytics | High |
| Sentry | ⚠️ Not Configured | Error Tracking | High |
| GitHub API | 🔄 Planned | Repository Integration | High |
| OpenAI API | 🔄 Planned | AI Agent Intelligence | Critical |
| Stripe | 🔄 Planned | Payment Processing | Medium |
| SendGrid | 🔄 Planned | Email Notifications | Medium |

## 3. Database Schema

### 3.1 Current Tables
```sql
-- Waitlist Table (Existing)
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Future Tables (To Be Implemented)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  github_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  avatar_url TEXT,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  github_org_id VARCHAR(255) UNIQUE,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  seats_used INTEGER DEFAULT 0,
  seats_limit INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  github_repo_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES repositories(id),
  status VARCHAR(50) DEFAULT 'pending',
  total_issues INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  scan_duration_seconds INTEGER,
  results JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID REFERENCES scans(id),
  repository_id UUID REFERENCES repositories(id),
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  description TEXT,
  wcag_criteria VARCHAR(50),
  suggested_fix TEXT,
  is_fixed BOOLEAN DEFAULT false,
  fixed_in_pr VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. Test Coverage Requirements

### 4.1 Current Test Coverage
- **Unit Tests**: 0% ❌
- **Integration Tests**: 0% ❌  
- **E2E Tests**: ~5% (Only waitlist form)
- **Performance Tests**: 0% ❌
- **Security Tests**: 0% ❌

### 4.2 Required Test Implementation

#### Unit Tests (Target: 80% Coverage)
```typescript
// Example test structure needed
describe('WaitlistForm', () => {
  test('validates email format', () => {});
  test('handles submission success', () => {});
  test('handles duplicate email gracefully', () => {});
  test('displays loading state during submission', () => {});
  test('handles network errors', () => {});
});

describe('Analytics', () => {
  test('tracks page views correctly', () => {});
  test('tracks form submissions', () => {});
  test('respects user consent preferences', () => {});
});
```

#### Integration Tests
```typescript
// API Route Tests
describe('/api/waitlist', () => {
  test('POST creates new waitlist entry', () => {});
  test('POST prevents duplicate emails', () => {});
  test('POST validates email format', () => {});
  test('POST handles database errors', () => {});
});

// Supabase Integration Tests  
describe('Supabase Client', () => {
  test('connects with correct credentials', () => {});
  test('handles connection failures', () => {});
  test('enforces row-level security', () => {});
});
```

#### E2E Tests (Playwright)
```typescript
// Critical User Journeys
test.describe('Landing Page Journey', () => {
  test('user can navigate all sections', async ({ page }) => {});
  test('all CTAs are clickable', async ({ page }) => {});
  test('mobile responsive design works', async ({ page }) => {});
});

test.describe('Waitlist Signup Journey', () => {
  test('complete signup flow', async ({ page }) => {});
  test('error handling for invalid inputs', async ({ page }) => {});
  test('success confirmation appears', async ({ page }) => {});
});

test.describe('Legal Pages', () => {
  test('privacy policy accessible', async ({ page }) => {});
  test('terms of service accessible', async ({ page }) => {});
  test('cookie policy accessible', async ({ page }) => {});
});
```

#### Performance Tests
```javascript
// Lighthouse CI Configuration
module.exports = {
  ci: {
    collect: {
      urls: ['/', '/privacy', '/terms'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

### 4.3 Test Infrastructure Setup
```json
// package.json additions needed
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:lighthouse": "lhci autorun"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "@lhci/cli": "^0.13.0",
    "msw": "^2.0.0"
  }
}
```

## 5. Security Requirements

### 5.1 Authentication & Authorization
- [ ] Implement proper API key rotation mechanism
- [ ] Add rate limiting to all API endpoints
- [ ] Implement CORS policies
- [ ] Add request signature validation
- [ ] Implement JWT-based authentication

### 5.2 Data Protection
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Implement field-level encryption for sensitive data
- [ ] Add input sanitization for all user inputs
- [ ] Implement CSRF protection
- [ ] Add Content Security Policy (CSP) headers

### 5.3 Compliance
- [ ] GDPR compliance for EU users
- [ ] CCPA compliance for California users
- [ ] SOC 2 Type II preparation
- [ ] WCAG 2.1 AA compliance (dogfooding)

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Environment Setup**
   - [ ] Create `.env.example` file
   - [ ] Set up Vercel environment variables
   - [ ] Configure Sentry integration
   - [ ] Set up Google Analytics

2. **Test Infrastructure**
   - [ ] Install and configure Vitest
   - [ ] Set up Testing Library
   - [ ] Configure Playwright for E2E
   - [ ] Add GitHub Actions for CI/CD

3. **Core Tests**
   - [ ] Unit tests for existing components
   - [ ] API route integration tests
   - [ ] Expand E2E test coverage

### Phase 2: Authentication (Week 3-4)
1. **GitHub OAuth Integration**
   - [ ] Implement GitHub App
   - [ ] Add OAuth flow
   - [ ] Create user sessions
   - [ ] Implement organization sync

2. **User Management**
   - [ ] User profile pages
   - [ ] Organization management
   - [ ] Team member invites
   - [ ] Role-based access control

### Phase 3: Core Features (Week 5-8)
1. **Repository Integration**
   - [ ] GitHub webhook handlers
   - [ ] Repository selection UI
   - [ ] Scan scheduling system
   - [ ] Real-time scan status

2. **AI Agent Implementation**
   - [ ] OpenAI integration
   - [ ] Prompt engineering
   - [ ] Issue detection logic
   - [ ] Fix generation system

3. **Pull Request Automation**
   - [ ] PR creation via GitHub API
   - [ ] Fix validation system
   - [ ] Merge conflict handling
   - [ ] Rollback mechanism

### Phase 4: Monetization (Week 9-10)
1. **Stripe Integration**
   - [ ] Payment flow implementation
   - [ ] Subscription management
   - [ ] Usage tracking
   - [ ] Invoice generation

2. **Plan Enforcement**
   - [ ] Feature gating
   - [ ] Usage limits
   - [ ] Upgrade prompts
   - [ ] Billing portal

### Phase 5: Scale & Polish (Week 11-12)
1. **Performance Optimization**
   - [ ] Database query optimization
   - [ ] Caching strategy
   - [ ] CDN configuration
   - [ ] Image optimization

2. **Monitoring & Analytics**
   - [ ] Custom dashboards
   - [ ] Alert configuration
   - [ ] Usage analytics
   - [ ] Performance metrics

## 7. Development Workflow

### 7.1 Branch Strategy
```bash
main (production)
├── staging
│   ├── feature/auth-system
│   ├── feature/github-integration
│   ├── feature/ai-agent
│   └── feature/payment-system
└── hotfix/critical-bugs
```

### 7.2 Testing Requirements
- All PRs must have >80% test coverage
- E2E tests must pass on staging
- Performance benchmarks must be met
- Security scan must pass

### 7.3 Deployment Process
1. Feature branch → Staging (Auto-deploy)
2. Staging → Production (Manual approval)
3. Rollback plan always ready
4. Feature flags for gradual rollout

## 8. Monitoring & Observability

### 8.1 Key Metrics
- **Performance**: Core Web Vitals, API response times
- **Reliability**: Uptime, error rates, success rates  
- **Business**: Sign-ups, conversions, churn rate
- **Security**: Failed auth attempts, suspicious activity

### 8.2 Alerting Rules
- API error rate > 1%
- Response time > 500ms (p95)
- Database connection failures
- Payment processing failures
- Security incidents

## 9. Disaster Recovery

### 9.1 Backup Strategy
- Database: Daily automated backups (30-day retention)
- Code: Git repository (GitHub)
- Secrets: Encrypted vault backup
- User data: GDPR-compliant export

### 9.2 Recovery Procedures
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 24 hours
- Documented runbooks for all scenarios
- Regular disaster recovery drills

## 10. Success Criteria

### 10.1 Technical Metrics
- [ ] 99.9% uptime SLA
- [ ] <200ms API response time (p50)
- [ ] >90 Lighthouse performance score
- [ ] Zero critical security vulnerabilities

### 10.2 Business Metrics
- [ ] 1000+ waitlist signups (Month 1)
- [ ] 100+ active repositories (Month 3)
- [ ] 50+ paying customers (Month 6)
- [ ] <3% monthly churn rate

## Appendix A: API Documentation

### Waitlist API
```typescript
POST /api/waitlist
Body: {
  email: string;
  source?: string;
  metadata?: Record<string, any>;
}
Response: {
  success: boolean;
  message: string;
}
```

### Future APIs
```typescript
// Authentication
POST /api/auth/github
GET /api/auth/session
POST /api/auth/logout

// Repositories
GET /api/repositories
POST /api/repositories/:id/scan
GET /api/repositories/:id/issues

// Scans
GET /api/scans/:id
GET /api/scans/:id/results
POST /api/scans/:id/retry

// Issues
GET /api/issues/:id
POST /api/issues/:id/fix
PUT /api/issues/:id/ignore
```

## Appendix B: Security Checklist

- [ ] All API keys in environment variables
- [ ] HTTPS enforced everywhere
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React default escaping)
- [ ] CSRF tokens on state-changing operations
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Regular dependency updates
- [ ] Security scanning in CI/CD