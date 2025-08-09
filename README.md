# AI Accessibility Scanner - Automated WCAG Compliance with PR Fixes

https://accessibility-ai-scanner.vercel.app/

> As AI agents begin to power everything from productivity tools to financial services, those built with full accessibility and inclusion by design aren't just ethically aligned—they are more interoperable, more likely to be adopted, and more trusted in the emerging networks of AI agents that interact, evaluate, and select one another.
> In this new paradigm, accessibility isn't a feature—it's a network advantage.

![Screenshot 1](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.35.26%E2%80%AFPM.png?raw=true)
![Screenshot 2](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.48.42%E2%80%AFPM.png?raw=true)
![Screenshot 3](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.48.51%E2%80%AFPM.png?raw=true)
![Screenshot 4](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.49.00%E2%80%AFPM.png?raw=true)
![Screenshot 5](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.49.08%E2%80%AFPM.png?raw=true)
![Screenshot 6](https://github.com/SHAFT-Foundation/accesssilityAIAgentProduct/blob/main/apps/web/public/Screenshot%202025-07-26%20at%202.49.15%E2%80%AFPM.png?raw=true)

## We Don't Just Find Accessibility Issues. We Fix Them.

The only accessibility tool that submits PRs with actual code fixes. Our AI agents scan your site, write the fix, test it, and submit a PR. You just review and merge.

> **⚡ AI Agents Need Accessible Sites** • ChatGPT, Claude & AI assistants can't navigate broken websites • **Be AI-ready or be invisible**

## 🎯 Complete Automation from Detection to Deployment

Unlike other tools that just give you a list of problems, we deliver working solutions.

### How It Works

1. **🔍 Detects Issues** - AI scans for WCAG violations
2. **💻 Writes Code Fixes** - Generates actual code solutions
3. **🧪 Runs Your Tests** - Validates fixes don't break anything
4. **🔀 Submits PRs** - Creates reviewable pull requests
5. **👁️ You Review & Merge** - Normal code review process

### The Key Difference

| ❌ Other Tools | ✅ Our Tool |
|----------------|-------------|
| "You have 47 accessibility issues on line 23, 156, 289..." | "PR #42: Fix alt text issues + contrast problems" |
| Still need developers to understand and fix each issue | Ready-to-review code that fixes the problems |

## 🛡️ Complete Legal Protection & Compliance

More than just code fixes — we provide comprehensive legal protection, automated compliance documentation, and expert support to defend against accessibility litigation.

### Features

- **Smart PR Generation** - Groups similar fixes, respects your code style
- **Test Integration** - Runs your test suite before submitting
- **ADA, AODA & EAA Compliance** - Full WCAG 2.2 AA/AAA + regional accessibility laws
- **Litigation Protection** - Legal defense package with automated proof of effort
- **Monthly Impact Reports** - Detailed accessibility metrics and remediation tracking
- **Dedicated Support** - Expert accessibility consultants available 24/7
- **Automated Documentation** - Court-ready compliance reports and audit trails
- **CI/CD Ready** - Integrates with your existing development pipeline

## 💰 Simple, Transparent Pricing

### Free Plan - $0/forever
- 1 repository
- 2 PRs per month
- Basic WCAG 2.2 AA checks
- Email support
- 7-day scan history
- Basic compliance reports

### Pro Plan - $29.99/month
- 1 repository
- Unlimited PRs
- ADA, AODA & EAA compliance
- Monthly accessibility reports
- Automated proof of effort
- Priority customer support
- Detailed remediation reports
- Custom test integration
- Slack notifications

### Enterprise - Custom pricing
- Multiple repositories
- Unlimited PRs
- Full litigation support package
- Litigation pledge & legal defense
- Dedicated accessibility consultant
- Custom compliance reporting
- Priority support & SLA
- SSO authentication
- Custom integrations
- Court-ready documentation

## 🛡️ Litigation Protection Guarantee

**Every paid plan includes our litigation defense pledge.** If you face accessibility-related legal action while actively using our service, we provide legal support documentation, expert testimony, and proof of good-faith compliance efforts. Your accessibility improvements are automatically documented for legal protection.

## 🚀 Deployment Instructions

### Prerequisites
- Node.js v18 or higher
- PostgreSQL database
- Redis instance
- GitHub OAuth App
- Stripe account (for payments)
- SendGrid account (for emails)

### Environment Variables

Create `.env.local` files in both `apps/api` and `apps/web` directories:

#### API Environment Variables (`apps/api/.env.local`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/accessibility_scanner"

# Redis
REDIS_URL="redis://localhost:6379"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# Stripe
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"

# SendGrid
SENDGRID_API_KEY="your_sendgrid_api_key"
FROM_EMAIL="noreply@yourdomain.com"

# JWT Secret
JWT_SECRET="your_jwt_secret"

# Sentry (optional)
SENTRY_DSN="your_sentry_dsn"

# OpenAI
OPENAI_API_KEY="your_openai_api_key"
```

#### Web Environment Variables (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
NEXT_PUBLIC_GITHUB_CLIENT_ID="your_github_client_id"
NEXT_PUBLIC_SENTRY_DSN="your_sentry_dsn"
```

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/accessibility-scanner.git
cd accessibility-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

4. Start Redis:
```bash
redis-server
```

5. Start the development servers:
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Web
cd apps/web
npm run dev

# Terminal 3 - Workers
cd apps/api
npm run worker:scan
npm run worker:pr
npm run worker:email
```

The application will be available at:
- Web: http://localhost:3000
- API: http://localhost:4000

### Production Deployment

#### Using Docker

1. Build the Docker images:
```bash
# API
cd apps/api
docker build -t accessibility-scanner-api -f Dockerfile.production .

# Web
cd apps/web
docker build -t accessibility-scanner-web -f Dockerfile.production .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

#### Using Railway

The project includes Railway configuration:

1. Connect your GitHub repository to Railway
2. Add the required environment variables
3. Deploy using the included `railway.json` configuration

#### Manual Deployment

1. Build the applications:
```bash
# API
cd apps/api
npm run build

# Web
cd apps/web
npm run build
```

2. Set up process managers (e.g., PM2):
```bash
# API
pm2 start npm --name "api" -- start

# Workers
pm2 start npm --name "scan-worker" -- run worker:scan
pm2 start npm --name "pr-worker" -- run worker:pr
pm2 start npm --name "email-worker" -- run worker:email

# Web
pm2 start npm --name "web" -- start
```

### Testing

Run the test suite:
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Security Considerations

- All source code processing happens in ephemeral containers
- We never store your source code - only PR diffs
- SOC 2 Type II certified infrastructure
- End-to-end encryption for all data in transit
- Regular security audits and penetration testing

### API Documentation

The API documentation is available at `http://localhost:4000/docs` when running locally.

### Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Support

For support, please open an issue in this repository or contact us through our website.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for a more accessible web. Because AI agents and humans deserve websites that work for everyone.
