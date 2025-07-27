#!/bin/bash

echo "🚀 Simple Landing Page + Waitlist Deployment Script"
echo "=================================================="

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed. Please install Node.js"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        echo "❌ git is required but not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Install Vercel CLI if not present
install_vercel() {
    if ! command -v vercel &> /dev/null; then
        echo "📦 Installing Vercel CLI..."
        npm install -g vercel
    else
        echo "✅ Vercel CLI already installed"
    fi
}

# Create a simplified landing page structure
setup_simple_project() {
    echo "🏗️  Setting up simplified project structure..."
    
    # Create a new directory for the simple deployment
    mkdir -p simple-landing
    cd simple-landing
    
    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "accessibility-scanner-landing",
  "version": "1.0.0",
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "lucide-react": "^0.263.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    echo "✅ Project setup complete"
}

# Create the simplified landing page files
create_landing_files() {
    echo "📝 Creating landing page files..."
    
    # Create directory structure
    mkdir -p src/app src/components/marketing src/components/layout
    
    # Create next.config.js
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/waitlist/:path*',
        destination: 'https://your-backend-url.com/api/waitlist/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
EOF

    # Create globals.css
    mkdir -p src/app
    cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

* {
  box-sizing: border-box;
}
EOF

    # Create layout.tsx
    cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Accessibility Scanner - Automated WCAG Compliance",
  description: "The only accessibility tool that submits PRs with actual code fixes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

    # Create the main page
    cat > src/app/page.tsx << 'EOF'
import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/marketing/Hero';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <Hero />
        
        {/* Bottom Waitlist CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Make Your Site Accessible?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
                Join thousands of developers automating accessibility fixes with AI.
              </p>
              <div className="mt-8 flex justify-center">
                <div className="w-full max-w-md">
                  <WaitlistForm 
                    source="bottom_cta"
                    placeholder="Enter your email"
                    buttonText="Get Early Access"
                    showCount={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
EOF

    echo "✅ Landing page files created"
}

# Copy components from the main project
copy_components() {
    echo "📋 Copying components..."
    
    # We'll create simplified versions of the components inline
    # This avoids dependency issues from the main project
    
    # Create Header component
    cat > src/components/layout/Header.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Accessibility Scanner
              </span>
            </a>
          </div>
          
          <div className="hidden lg:block">
            <WaitlistForm 
              source="header"
              placeholder="Enter email for early access"
              buttonText="Get Notified"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
EOF

    # Create Hero component
    cat > src/components/marketing/Hero.tsx << 'EOF'
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            We Don&apos;t Just Find Accessibility Issues.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              We Fix Them.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            The only accessibility tool that submits PRs with actual code fixes. 
            Our AI agents scan your site, write the fix, test it, and submit a PR.
          </p>
        </div>
      </div>
    </section>
  );
}
EOF

    # Create WaitlistForm component
    cat > src/components/marketing/WaitlistForm.tsx << 'EOF'
'use client';

import { useState } from 'react';

interface WaitlistFormProps {
  source?: string;
  placeholder?: string;
  buttonText?: string;
  showCount?: boolean;
}

export function WaitlistForm({ 
  source = 'unknown', 
  placeholder = 'Enter your email',
  buttonText = 'Join Waitlist',
  showCount = false
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setStatus('loading');
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
        setMessage('Thanks! We\'ll notify you when we launch.');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-green-600 text-center">
        ✅ {message}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          disabled={status === 'loading'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : buttonText}
        </button>
      </form>
      
      {status === 'error' && (
        <p className="mt-2 text-red-600 text-sm">{message}</p>
      )}
    </div>
  );
}
EOF

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    # Add Tailwind CSS
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    
    # Update tailwind.config.js
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

    echo "✅ Components copied and configured"
}

# Deploy to Vercel
deploy_to_vercel() {
    echo "🚀 Deploying to Vercel..."
    
    # Login to Vercel (this will prompt user if not logged in)
    echo "📝 Please log in to Vercel when prompted..."
    vercel login
    
    # Deploy
    echo "🌐 Deploying your landing page..."
    vercel --prod
    
    echo "✅ Deployment complete!"
    echo ""
    echo "🎉 Your landing page is now live!"
    echo "📧 The waitlist forms are ready (you'll need to set up the backend API separately)"
    echo ""
    echo "Next steps:"
    echo "1. Set up a simple backend for the waitlist API"
    echo "2. Update the next.config.js with your backend URL"
    echo "3. Redeploy with: vercel --prod"
}

# Main execution
main() {
    echo "Starting deployment process..."
    
    check_dependencies
    install_vercel
    setup_simple_project
    create_landing_files
    copy_components
    deploy_to_vercel
    
    echo ""
    echo "🎊 All done! Your landing page is deployed!"
}

# Run if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi