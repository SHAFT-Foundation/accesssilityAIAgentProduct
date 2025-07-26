import { Hero } from '@/components/marketing/Hero';
import { ValueProposition } from '@/components/marketing/ValueProposition';
import { AIAgentSection } from '@/components/marketing/AIAgentSection';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { SolutionSection } from '@/components/marketing/SolutionSection';
import { LegalCompliance } from '@/components/marketing/LegalCompliance';
import { SecuritySection } from '@/components/marketing/SecuritySection';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Features } from '@/components/marketing/Features';
import { Pricing } from '@/components/marketing/Pricing';
import { TrustSignals } from '@/components/marketing/TrustSignals';

// FAQ Schema for better SEO
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does AI Accessibility Scanner fix accessibility issues?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our AI scans your website, identifies WCAG violations, writes the actual code fixes, runs your tests to ensure compatibility, and submits a GitHub PR for your review. You simply review and merge the fixes.'
      }
    },
    {
      '@type': 'Question', 
      name: 'Is my source code secure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We use ephemeral containers that are destroyed after each PR. We never store your source code - only the PR diffs. We\'re SOC 2 Type II certified with enterprise-grade security.'
      }
    },
    {
      '@type': 'Question',
      name: 'What accessibility standards do you support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We support WCAG 2.2 levels A, AA, and AAA compliance, ADA compliance, and Section 508 standards. Our AI is trained on the latest accessibility guidelines.'
      }
    },
    {
      '@type': 'Question',
      name: 'How much does it cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We offer a free plan with 2 PRs per month, Pro plan at $29.99/month for unlimited PRs on 1 repository, and Enterprise plans for multiple repositories with priority support.'
      }
    }
  ]
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="min-h-screen">
        <Hero />
        <ValueProposition />
        <AIAgentSection />
        <ProblemSection />
        <SolutionSection />
        <LegalCompliance />
        <SecuritySection />
        <HowItWorks />
        <Features />
        <Pricing />
        <TrustSignals />
      </main>
    </>
  );
}

export const metadata = {
  title: 'AI Accessibility Scanner - Automated WCAG Compliance with PR Fixes',
  description: 'The only accessibility tool that submits PRs with actual code fixes. Our AI agents scan your site, write the fix, test it, and submit a PR. You just review and merge.',
  keywords: 'accessibility scanner, WCAG compliance, automated accessibility testing, accessibility fixes, GitHub integration, AI accessibility',
  openGraph: {
    title: 'AI Accessibility Scanner - We Fix Issues, Not Just Find Them',
    description: 'Automated accessibility compliance with AI-generated PR fixes. Scan, fix, test, and merge in your existing workflow.',
    type: 'website',
    url: 'https://accessibility-scanner.com',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Accessibility Scanner - Automated WCAG Compliance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Accessibility Scanner - Automated WCAG Compliance',
    description: 'The only tool that submits PRs with actual accessibility fixes. Scan, fix, test, merge.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
