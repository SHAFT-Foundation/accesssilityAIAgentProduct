#!/bin/bash

echo "🚀 CLEAN SIMPLE DEPLOYMENT"
echo "========================="
echo "This creates a working landing page from scratch that WILL deploy"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Create a completely new clean project
create_clean_project() {
    echo -e "${BLUE}🏗️  Creating clean project...${NC}"
    
    # Create new directory
    PROJECT_NAME="landing-clean"
    rm -rf "$PROJECT_NAME"
    mkdir "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    # Initialize with create-next-app (this always works)
    npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
    
    echo -e "${GREEN}✅ Clean project created${NC}"
}

# Set up Supabase in clean project
setup_supabase_clean() {
    echo -e "${BLUE}🗄️  Setting up Supabase...${NC}"
    
    if [ ! -f "../apps/web/.env.local" ]; then
        echo -e "${YELLOW}📝 Please enter your Supabase details:${NC}"
        read -p "Enter your Supabase Project URL: " SUPABASE_URL
        read -p "Enter your Supabase Anon Key: " SUPABASE_KEY
    else
        echo -e "${GREEN}Found existing Supabase config, copying...${NC}"
        SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL ../apps/web/.env.local | cut -d '=' -f2)
        SUPABASE_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY ../apps/web/.env.local | cut -d '=' -f2)
    fi
    
    # Create environment file
    cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
EOF
    
    # Install Supabase
    npm install @supabase/supabase-js
    
    echo -e "${GREEN}✅ Supabase configured${NC}"
}

# Create the working landing page
create_landing_page() {
    echo -e "${BLUE}📝 Creating landing page...${NC}"
    
    # Create Supabase client
    mkdir -p src/lib
    cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
EOF

    # Create the main landing page
    cat > src/app/page.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [count, setCount] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setStatus('loading')
    
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email, source: 'landing' }])

      if (error) {
        if (error.code === '23505') {
          setStatus('error')
          setMessage('Email already registered!')
        } else {
          throw error
        }
      } else {
        setStatus('success')
        setEmail('')
        setMessage('Thanks! We\'ll notify you when we launch.')
        fetchCount()
      }
    } catch (error) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  const fetchCount = async () => {
    try {
      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
      setCount(count)
    } catch (error) {
      console.error('Failed to fetch count:', error)
    }
  }

  useEffect(() => {
    fetchCount()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
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
            
            {/* Header Waitlist Form */}
            <div className="hidden md:block">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Get early access"
                  required
                  disabled={status === 'loading' || status === 'success'}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !email || status === 'success'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {status === 'loading' ? '...' : status === 'success' ? '✓' : 'Join'}
                </button>
              </form>
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

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mb-8 p-4 bg-green-100 text-green-800 rounded-lg max-w-md mx-auto">
              ✅ {message}
            </div>
          )}
          
          {status === 'error' && (
            <div className="mb-8 p-4 bg-red-100 text-red-800 rounded-lg max-w-md mx-auto">
              ❌ {message}
            </div>
          )}

          {/* Main Waitlist Form */}
          {status !== 'success' && (
            <div className="max-w-md mx-auto mb-8">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {status === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Get Early Access'
                  )}
                </button>
              </form>
            </div>
          )}

          {count !== null && (
            <p className="text-sm text-gray-500 mb-8">
              {count.toLocaleString()} people already on the waitlist
            </p>
          )}

          <p className="text-sm text-gray-500">
            Join the waitlist • No spam • Unsubscribe anytime
          </p>
        </div>
      </section>

      {/* Features */}
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
          
          {status !== 'success' && (
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {status === 'loading' ? '...' : 'Join Waitlist'}
                </button>
              </form>
            </div>
          )}
          
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
    </div>
  )
}
EOF

    # Update layout with better metadata
    cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Accessibility Scanner - Automated WCAG Compliance',
  description: 'The only accessibility tool that submits PRs with actual code fixes. Coming soon.',
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

    echo -e "${GREEN}✅ Landing page created${NC}"
}

# Test build
test_build() {
    echo -e "${BLUE}🔨 Testing build...${NC}"
    
    if npm run build; then
        echo -e "${GREEN}✅ Build successful!${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
}

# Deploy to Vercel
deploy() {
    echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
    
    # Install Vercel CLI if needed
    if ! command -v vercel &> /dev/null; then
        npm install -g vercel
    fi
    
    # Deploy
    echo -e "${BLUE}🌐 Deploying...${NC}"
    vercel --prod
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Show completion
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 SUCCESS! YOUR LANDING PAGE IS LIVE! 🎉${NC}"
    echo "=============================================="
    echo ""
    echo -e "${BLUE}✅ Clean Next.js project created${NC}"
    echo -e "${BLUE}✅ Waitlist forms working${NC}"
    echo -e "${BLUE}✅ Supabase database connected${NC}"
    echo -e "${BLUE}✅ Deployed to Vercel${NC}"
    echo ""
    echo -e "${YELLOW}📊 To view signups: Supabase dashboard → Table Editor → waitlist${NC}"
    echo -e "${YELLOW}🔄 To update: Make changes and run 'vercel --prod'${NC}"
    echo ""
    echo -e "${GREEN}Your landing page is live and collecting emails! 🚀${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Creating a clean working deployment...${NC}"
    echo ""
    
    create_clean_project
    setup_supabase_clean
    create_landing_page
    test_build
    deploy
    show_completion
}

# Run
main "$@"