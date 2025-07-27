import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://accessibility.shaft.finance'),
  title: {
    default: 'Shaft Accessibility Scanner - Automated WCAG Compliance with PR Fixes',
    template: '%s | Shaft Accessibility Scanner'
  },
  description: 'The only accessibility tool that submits PRs with actual code fixes. Our AI agents scan your site, write the fix, test it, and submit a PR. Enterprise-grade security with ephemeral environments.',
  keywords: [
    'accessibility scanner',
    'WCAG compliance',
    'automated accessibility testing',
    'accessibility fixes',
    'GitHub integration',
    'AI accessibility',
    'web accessibility',
    'ADA compliance',
    'Section 508',
    'accessibility automation'
  ],
  authors: [{ name: 'AI Accessibility Scanner Team' }],
  creator: 'AI Accessibility Scanner',
  publisher: 'AI Accessibility Scanner',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://accessibility-scanner.com',
    siteName: 'AI Accessibility Scanner',
    title: 'AI Accessibility Scanner - We Fix Issues, Not Just Find Them',
    description: 'Automated accessibility compliance with AI-generated PR fixes. Scan, fix, test, and merge in your existing workflow. Enterprise security with ephemeral environments.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Accessibility Scanner - Automated WCAG Compliance with PR Fixes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Accessibility Scanner - Automated WCAG Compliance',
    description: 'The only tool that submits PRs with actual accessibility fixes. Scan, fix, test, merge. Enterprise security.',
    images: ['/og-image.jpg'],
    creator: '@AccessibilityAI',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
    yahoo: 'yahoo-verification-code',
  },
  alternates: {
    canonical: 'https://accessibility-scanner.com',
  },
  category: 'technology',
};

// Schema.org structured data for SaaS application
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI Accessibility Scanner',
  description: 'Automated accessibility compliance tool that creates GitHub PRs with actual code fixes for WCAG violations.',
  url: 'https://accessibility-scanner.com',
  logo: 'https://accessibility-scanner.com/logo.png',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web Browser',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      description: '2 PRs per month',
      price: '0',
      priceCurrency: 'USD',
      category: 'Free'
    },
    {
      '@type': 'Offer', 
      name: 'Pro Plan',
      description: 'Unlimited PRs for 1 repository',
      price: '29.99',
      priceCurrency: 'USD',
      category: 'Subscription'
    },
    {
      '@type': 'Offer',
      name: 'Enterprise Plan', 
      description: 'Multiple repositories with priority support',
      category: 'Enterprise'
    }
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127'
  },
  publisher: {
    '@type': 'Organization',
    name: 'AI Accessibility Scanner',
    url: 'https://accessibility-scanner.com',
    logo: 'https://accessibility-scanner.com/logo.png'
  },
  featureList: [
    'Automated WCAG 2.2 compliance scanning',
    'AI-generated code fixes',
    'GitHub PR integration',
    'Real-time accessibility monitoring',
    'Enterprise-grade security',
    'Zero source code retention'
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
