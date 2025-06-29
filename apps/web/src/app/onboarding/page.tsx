import { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Get Started - AI Accessibility Scanner',
  description: 'Complete your setup and start scanning for accessibility issues. Connect your GitHub repository and create your first automated fix.',
  robots: {
    index: false, // Don't index onboarding pages
    follow: false,
  },
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingFlow />
    </div>
  );
}