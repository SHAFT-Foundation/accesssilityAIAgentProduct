'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { WaitlistForm } from '@/components/marketing/WaitlistForm';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full bg-white z-50 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Shaft Logo */}
          <div className="flex items-center">
            <a href="https://shaft.finance" className="flex items-center space-x-3">
              <img 
                src="/Artboard 46.avif" 
                alt="Shaft Foundation Logo" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl font-semibold text-shaft-black">
                Shaft Accessibility Scanner
              </span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-shaft-gray hover:text-shaft-black transition-colors font-medium"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('pricing')} 
              className="text-shaft-gray hover:text-shaft-black transition-colors font-medium"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('security')} 
              className="text-shaft-gray hover:text-shaft-black transition-colors font-medium"
            >
              Security
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="text-shaft-gray hover:text-shaft-black transition-colors font-medium"
            >
              Contact
            </button>
            <a href="/docs" className="text-shaft-gray hover:text-shaft-black transition-colors font-medium">
              Resources
            </a>
          </nav>

          {/* Desktop Waitlist Form */}
          <div className="hidden lg:block">
            <WaitlistForm 
              source="header"
              className="flex items-center space-x-2"
              placeholder="Enter email for early access"
              buttonText="Get Early Access"
            />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 text-shaft-gray hover:text-shaft-black focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-gray-100">
            <button
              onClick={() => scrollToSection('features')}
              className="block px-3 py-2 text-base font-medium text-shaft-gray hover:text-shaft-black w-full text-left"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block px-3 py-2 text-base font-medium text-shaft-gray hover:text-shaft-black w-full text-left"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="block px-3 py-2 text-base font-medium text-shaft-gray hover:text-shaft-black w-full text-left"
            >
              Security
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block px-3 py-2 text-base font-medium text-shaft-gray hover:text-shaft-black w-full text-left"
            >
              Contact
            </button>
            <a
              href="/docs"
              className="block px-3 py-2 text-base font-medium text-shaft-gray hover:text-shaft-black"
              onClick={() => setIsMenuOpen(false)}
            >
              Resources
            </a>
            <div className="px-3 py-2">
              <WaitlistForm 
                source="mobile_menu"
                placeholder="Your email"
                buttonText="Join Waitlist"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}