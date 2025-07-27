import { Hero } from '@/components/marketing/Hero';
import { ValueProposition } from '@/components/marketing/ValueProposition';
import { AIAgentSection } from '@/components/marketing/AIAgentSection';
import { NetworkAdvantage } from '@/components/marketing/NetworkAdvantage';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { SolutionSection } from '@/components/marketing/SolutionSection';
import { LegalCompliance } from '@/components/marketing/LegalCompliance';
import { SecuritySection } from '@/components/marketing/SecuritySection';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Features } from '@/components/marketing/Features';
import { Pricing } from '@/components/marketing/Pricing';
import { TrustSignals } from '@/components/marketing/TrustSignals';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';

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
      <Header />
      <main className="min-h-screen pt-16">
        <Hero />
        <ValueProposition />
        <AIAgentSection />
        <NetworkAdvantage />
        <ProblemSection />
        <SolutionSection />
        <LegalCompliance />
        <div id="security">
          <SecuritySection />
        </div>
        <HowItWorks />
        <div id="features">
          <Features />
        </div>
        <div id="pricing">
          <Pricing />
        </div>
        <TrustSignals />
        
        {/* Waitlist CTA Section */}
        <section className="bg-shaft-light-gray py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-shaft-black sm:text-4xl">
                Ready to Make Your Site Accessible?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-shaft-gray">
                Join thousands of developers who are already using AI to automate accessibility fixes.
                Be the first to know when we launch.
              </p>
              <div className="mt-8 flex justify-center">
                <div className="w-full max-w-md">
                  <WaitlistForm 
                    source="bottom_cta"
                    placeholder="Enter your email"
                    buttonText="Get Early Access"
                    showCount={true}
                    className="space-y-3"
                  />
                </div>
              </div>
              <p className="mt-4 text-sm text-shaft-gray">
                No spam. Unsubscribe anytime. We'll send you product updates and launch notifications.
              </p>
            </div>
          </div>
        </section>
        <div id="contact">
          <Footer />
        </div>
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
