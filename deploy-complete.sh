#!/bin/bash

echo "🚀 Complete Landing Page + Waitlist Deployment"
echo "=============================================="
echo "This script will:"
echo "1. Create a simple Next.js landing page"
echo "2. Set up Supabase database (free tier)"
echo "3. Deploy to Vercel (free tier)"
echo "4. Give you a live website with working waitlist"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}📋 Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is required. Please install from https://nodejs.org${NC}"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is required. Please install git${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Install required CLIs
install_tools() {
    echo -e "${BLUE}📦 Installing deployment tools...${NC}"
    
    # Install Vercel CLI
    if ! command -v vercel &> /dev/null; then
        npm install -g vercel
    fi
    
    # Install Supabase CLI
    if ! command -v supabase &> /dev/null; then
        npm install -g supabase
    fi
    
    echo -e "${GREEN}✅ Tools installed${NC}"
}

# Create the project
create_project() {
    echo -e "${BLUE}🏗️  Creating landing page project...${NC}"
    
    # Create project directory
    PROJECT_NAME="accessibility-landing-$(date +%s)"
    mkdir "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    # Initialize Next.js project
    npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    
    echo -e "${GREEN}✅ Project created: $PROJECT_NAME${NC}"
}

# Set up Supabase
setup_supabase() {
    echo -e "${BLUE}🗄️  Setting up Supabase database...${NC}"
    
    echo -e "${YELLOW}📝 Please follow these steps:${NC}"
    echo "1. Go to https://supabase.com"
    echo "2. Sign up/login (free account)"
    echo "3. Create a new project"
    echo "4. Copy your project URL and anon key"
    echo ""
    
    read -p "Enter your Supabase Project URL: " SUPABASE_URL
    read -p "Enter your Supabase Anon Key: " SUPABASE_KEY
    
    # Create environment file
    cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF
    
    # Install Supabase client
    npm install @supabase/supabase-js
    
    # Create the waitlist table SQL
    cat > setup_database.sql << 'EOF'
-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (for the waitlist form)
CREATE POLICY "Allow waitlist inserts" ON waitlist
    FOR INSERT WITH CHECK (true);

-- Create policy to allow reading count (for showing total signups)
CREATE POLICY "Allow reading waitlist count" ON waitlist
    FOR SELECT USING (true);
EOF
    
    echo -e "${YELLOW}📝 Please run this SQL in your Supabase dashboard:${NC}"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Click 'SQL Editor' in the sidebar"
    echo "3. Paste and run the SQL from setup_database.sql"
    echo ""
    read -p "Press Enter when you've run the SQL..."
    
    echo -e "${GREEN}✅ Supabase configured${NC}"
}

# Create landing page components
create_components() {
    echo -e "${BLUE}📝 Creating landing page components...${NC}"
    
    # Create Supabase client
    mkdir -p src/lib
    cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
EOF

    # Create WaitlistForm component
    mkdir -p src/components
    cat > src/components/WaitlistForm.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WaitlistFormProps {
  source?: string
  placeholder?: string
  buttonText?: string
  className?: string
}

export function WaitlistForm({ 
  source = 'unknown',
  placeholder = 'Enter your email',
  buttonText = 'Join Waitlist',
  className = ''
}: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) return
    
    setStatus('loading')
    
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([
          { 
            email, 
            source,
            metadata: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          }
        ])

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setStatus('error')
          setMessage('Email already registered!')
        } else {
          throw error
        }
      } else {
        setStatus('success')
        setEmail('')
        setMessage('Thanks! We\'ll notify you when we launch.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className={`text-green-600 text-center ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl">✅</span>
          <span>{message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          disabled={status === 'loading'}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium transition-colors"
        >
          {status === 'loading' ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            buttonText
          )}
        </button>
      </form>
      
      {status === 'error' && (
        <p className="mt-2 text-red-600 text-sm text-center">{message}</p>
      )}
    </div>
  )
}
EOF

    # Update the main page
    cat > src/app/page.tsx << 'EOF'
import { WaitlistForm } from '@/components/WaitlistForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Accessibility Scanner
              </h1>
            </div>
            <div className="hidden md:block">
              <WaitlistForm 
                source="header"
                placeholder="Get early access"
                buttonText="Notify Me"
                className="max-w-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              ✨ Coming Soon
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8">
            We Don't Just Find 
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Accessibility Issues
            </span>
            <span className="block">We Fix Them</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            The only accessibility tool that submits PRs with actual code fixes. 
            Our AI agents scan your site, write the fix, test it, and submit a PR. 
            You just review and merge.
          </p>

          <div className="max-w-md mx-auto mb-8">
            <WaitlistForm 
              source="hero"
              placeholder="Enter your email"
              buttonText="Get Early Access"
            />
          </div>

          <p className="text-sm text-gray-500">
            Join the waitlist • No spam • Unsubscribe anytime
          </p>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Automated accessibility fixes in your workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Scan</h3>
              <p className="text-gray-600">
                Our AI scans your website for WCAG compliance issues
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Fix</h3>
              <p className="text-gray-600">
                AI writes actual code fixes and runs your tests
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Deploy</h3>
              <p className="text-gray-600">
                Review the PR and merge - your site is now accessible
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Automate Accessibility?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join thousands of developers who will use AI to fix accessibility issues automatically.
          </p>
          
          <div className="max-w-md mx-auto">
            <WaitlistForm 
              source="bottom_cta"
              placeholder="Enter your email"
              buttonText="Get Early Access"
              className="bg-white p-6 rounded-lg shadow-lg"
            />
          </div>
          
          <p className="text-blue-200 text-sm mt-6">
            Be first to know when we launch • No spam ever
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="text-xl font-bold">Accessibility Scanner</span>
          </div>
          <p className="text-gray-400">
            Making the web accessible with AI • Coming Soon
          </p>
        </div>
      </footer>
    </main>
  )
}
EOF

    # Update layout metadata
    cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Accessibility Scanner - Automated WCAG Compliance',
  description: 'The only accessibility tool that submits PRs with actual code fixes. Coming soon.',
  keywords: ['accessibility', 'WCAG', 'AI', 'automation', 'web development'],
  authors: [{ name: 'Accessibility Scanner Team' }],
  openGraph: {
    title: 'AI Accessibility Scanner - We Fix Issues, Not Just Find Them',
    description: 'Automated accessibility compliance with AI-generated PR fixes. Coming soon.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

    echo -e "${GREEN}✅ Components created${NC}"
}

# Deploy to Vercel
deploy_to_vercel() {
    echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
    
    # Build the project first
    npm run build
    
    # Login to Vercel
    echo -e "${YELLOW}📝 Please log in to Vercel when prompted...${NC}"
    vercel login
    
    # Deploy
    echo -e "${BLUE}🌐 Deploying your landing page...${NC}"
    vercel --prod
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Show final instructions
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
    echo "================================"
    echo ""
    echo -e "${BLUE}✅ Your landing page is live!${NC}"
    echo -e "${BLUE}✅ Waitlist is collecting emails in Supabase${NC}"
    echo -e "${BLUE}✅ Everything is on free tiers${NC}"
    echo ""
    echo -e "${YELLOW}📊 To view waitlist signups:${NC}"
    echo "1. Go to your Supabase dashboard"
    echo "2. Click 'Table Editor'"
    echo "3. Select 'waitlist' table"
    echo ""
    echo -e "${YELLOW}🔄 To update your site:${NC}"
    echo "1. Make changes to your code"
    echo "2. Run: vercel --prod"
    echo ""
    echo -e "${GREEN}Total cost: $0 (everything is free tier)${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}Starting complete deployment...${NC}"
    echo ""
    
    check_dependencies
    install_tools
    create_project
    setup_supabase
    create_components
    deploy_to_vercel
    show_completion
    
    echo -e "${GREEN}🎊 All done! Your landing page is live with a working waitlist!${NC}"
}

# Error handling
set -e
trap 'echo -e "${RED}❌ An error occurred. Check the output above.${NC}"' ERR

# Run the script
main "$@"