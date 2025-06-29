import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create demo users
  const demoPassword = await bcrypt.hash('demo123456', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@accessibility-scanner.com' },
    update: {},
    create: {
      email: 'demo@accessibility-scanner.com',
      name: 'Demo User',
      provider: 'email',
      password: demoPassword,
      subscription: 'PRO',
      prQuota: 50,
      prUsed: 12,
    },
  });

  const githubUser = await prisma.user.upsert({
    where: { email: 'github-demo@accessibility-scanner.com' },
    update: {},
    create: {
      email: 'github-demo@accessibility-scanner.com',
      name: 'GitHub Demo User',
      provider: 'github',
      githubId: '12345678',
      githubUsername: 'demo-user',
      subscription: 'FREE',
      prQuota: 2,
      prUsed: 1,
    },
  });

  console.log('✅ Created demo users:', { demoUser: demoUser.id, githubUser: githubUser.id });

  // Create demo repositories
  const demoRepo1 = await prisma.repository.upsert({
    where: { githubId: 123456789 },
    update: {},
    create: {
      userId: githubUser.id,
      githubId: 123456789,
      name: 'my-awesome-website',
      owner: 'demo-user',
      fullName: 'demo-user/my-awesome-website',
      installationId: 987654321,
      isActive: true,
    },
  });

  const demoRepo2 = await prisma.repository.upsert({
    where: { githubId: 123456790 },
    update: {},
    create: {
      userId: demoUser.id,
      githubId: 123456790,
      name: 'e-commerce-site',
      owner: 'demo-company',
      fullName: 'demo-company/e-commerce-site',
      installationId: 987654322,
      isActive: true,
    },
  });

  console.log('✅ Created demo repositories:', { 
    repo1: demoRepo1.id, 
    repo2: demoRepo2.id 
  });

  // Create demo scans
  const completedScan = await prisma.scan.create({
    data: {
      url: 'https://demo-user.github.io/my-awesome-website',
      repositoryId: demoRepo1.id,
      userId: githubUser.id,
      status: 'COMPLETED',
      metadata: {
        browser: 'chromium',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (compatible; AccessibilityScanner/1.0)',
        scanOptions: {
          includeExperimental: false,
          level: 'AA',
          tags: ['wcag2a', 'wcag2aa'],
        },
      },
      startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      completedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
  });

  const pendingScan = await prisma.scan.create({
    data: {
      url: 'https://demo-company.github.io/e-commerce-site',
      repositoryId: demoRepo2.id,
      userId: demoUser.id,
      status: 'PROCESSING',
      metadata: {
        browser: 'chromium',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (compatible; AccessibilityScanner/1.0)',
        scanOptions: {
          includeExperimental: true,
          level: 'AAA',
          tags: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
        },
      },
      startedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    },
  });

  console.log('✅ Created demo scans:', { 
    completedScan: completedScan.id, 
    pendingScan: pendingScan.id 
  });

  // Create demo issues for completed scan
  const issues = [
    {
      scanId: completedScan.id,
      type: 'missing_alt_text',
      severity: 'CRITICAL' as const,
      wcagCriteria: '1.1.1',
      title: 'Image missing alt text',
      description: 'Images must have alt text to be accessible to screen reader users.',
      location: {
        file: 'src/pages/index.tsx',
        line: 42,
        selector: 'img.hero-image',
        xpath: '/html/body/main/section[1]/img',
      },
      suggestedFix: 'Add descriptive alt text: <img src="hero.jpg" alt="Team celebrating project completion in modern office" />',
      status: 'OPEN' as const,
      groupHash: 'alt_text_missing_hero',
    },
    {
      scanId: completedScan.id,
      type: 'color_contrast',
      severity: 'MAJOR' as const,
      wcagCriteria: '1.4.3',
      title: 'Insufficient color contrast',
      description: 'Text color contrast ratio is 3.2:1, but should be at least 4.5:1 for normal text.',
      location: {
        file: 'src/components/Button.tsx',
        line: 28,
        selector: '.btn-secondary',
        xpath: '/html/body/main/section[2]/button',
      },
      suggestedFix: 'Change text color from #757575 to #666666 or darker to meet contrast requirements.',
      status: 'OPEN' as const,
      groupHash: 'contrast_btn_secondary',
    },
    {
      scanId: completedScan.id,
      type: 'heading_structure',
      severity: 'MAJOR' as const,
      wcagCriteria: '1.3.1',
      title: 'Heading levels skip from H1 to H3',
      description: 'Heading structure should be logical and sequential. Found H1 followed by H3.',
      location: {
        file: 'src/pages/about.tsx',
        line: 15,
        selector: 'h3.section-title',
        xpath: '/html/body/main/section[1]/h3',
      },
      suggestedFix: 'Change <h3 className="section-title"> to <h2 className="section-title"> to maintain proper heading hierarchy.',
      status: 'OPEN' as const,
      groupHash: 'heading_skip_about',
    },
    {
      scanId: completedScan.id,
      type: 'form_label',
      severity: 'CRITICAL' as const,
      wcagCriteria: '1.3.1',
      title: 'Form input missing label',
      description: 'Form inputs must have associated labels for screen reader accessibility.',
      location: {
        file: 'src/components/ContactForm.tsx',
        line: 67,
        selector: 'input[type="email"]',
        xpath: '/html/body/main/form/input[2]',
      },
      suggestedFix: 'Add label: <label htmlFor="email">Email Address</label><input type="email" id="email" name="email" />',
      status: 'OPEN' as const,
      groupHash: 'form_label_email',
    },
    {
      scanId: completedScan.id,
      type: 'focus_indicator',
      severity: 'MINOR' as const,
      wcagCriteria: '2.4.7',
      title: 'Interactive element missing focus indicator',
      description: 'Interactive elements must have visible focus indicators for keyboard navigation.',
      location: {
        file: 'src/styles/globals.css',
        line: 89,
        selector: '.custom-button:focus',
        xpath: '/html/body/nav/button',
      },
      suggestedFix: 'Add focus styles: .custom-button:focus { outline: 2px solid #0066cc; outline-offset: 2px; }',
      status: 'OPEN' as const,
      groupHash: 'focus_custom_button',
    },
  ];

  const createdIssues = await Promise.all(
    issues.map(issue => prisma.issue.create({ data: issue }))
  );

  console.log('✅ Created demo issues:', createdIssues.length);

  // Create demo pull request
  const demoPR = await prisma.pullRequest.create({
    data: {
      repositoryId: demoRepo1.id,
      githubPrNumber: 42,
      status: 'OPEN',
      branch: 'fix/accessibility-improvements',
      title: 'Fix accessibility issues: Add alt text and improve contrast',
      description: `## Accessibility Improvements

This PR fixes several accessibility issues found during automated scanning:

### Changes Made:
- ✅ Added alt text to hero image
- ✅ Improved color contrast for secondary buttons
- ✅ Fixed heading hierarchy on about page
- ✅ Added proper labels to contact form
- ✅ Enhanced focus indicators

### WCAG Compliance:
- Addresses WCAG 2.1 Level AA criteria
- Improves compatibility with screen readers
- Enhances keyboard navigation

### Testing:
- [x] Verified with axe-core
- [x] Tested with NVDA screen reader
- [x] Checked keyboard navigation
- [x] Validated color contrast ratios

Generated by AI Accessibility Scanner 🤖`,
      diffUrl: 'https://github.com/demo-user/my-awesome-website/pull/42.diff',
    },
  });

  // Link issues to pull request
  await prisma.pullRequest.update({
    where: { id: demoPR.id },
    data: {
      issues: {
        connect: createdIssues.slice(0, 3).map(issue => ({ id: issue.id })),
      },
    },
  });

  console.log('✅ Created demo pull request:', demoPR.id);

  // Create audit logs
  const auditLogs = [
    {
      userId: githubUser.id,
      action: 'scan_created',
      entityType: 'scan',
      entityId: completedScan.id,
      metadata: {
        url: completedScan.url,
        repository: demoRepo1.fullName,
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      userId: githubUser.id,
      action: 'scan_completed',
      entityType: 'scan',
      entityId: completedScan.id,
      metadata: {
        issuesFound: createdIssues.length,
        duration: 300000, // 5 minutes
        criticalIssues: 2,
        majorIssues: 2,
        minorIssues: 1,
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      userId: githubUser.id,
      action: 'pr_created',
      entityType: 'pull_request',
      entityId: demoPR.id,
      metadata: {
        repository: demoRepo1.fullName,
        prNumber: demoPR.githubPrNumber,
        issuesFixed: 3,
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      userId: demoUser.id,
      action: 'subscription_changed',
      entityType: 'user',
      entityId: demoUser.id,
      metadata: {
        from: 'FREE',
        to: 'PRO',
        reason: 'upgrade',
      },
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  ];

  await Promise.all(
    auditLogs.map(log => prisma.auditLog.create({ data: log }))
  );

  console.log('✅ Created audit logs:', auditLogs.length);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`- Users: 2 (1 email, 1 GitHub)`);
  console.log(`- Repositories: 2`);
  console.log(`- Scans: 2 (1 completed, 1 processing)`);
  console.log(`- Issues: ${createdIssues.length}`);
  console.log(`- Pull Requests: 1`);
  console.log(`- Audit Logs: ${auditLogs.length}`);
  console.log('');
  console.log('🔐 Demo Credentials:');
  console.log('Email: demo@accessibility-scanner.com');
  console.log('Password: demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });