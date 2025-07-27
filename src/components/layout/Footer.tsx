'use client';

import { Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Contact */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              <a 
                href="mailto:hello@accessibility-scanner.com" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                hello@accessibility-scanner.com
              </a>
              <div className="text-shaft-gray text-sm">
                <p>Accessibility Scanner</p>
                <p>San Francisco, CA</p>
                <p>United States</p>
              </div>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Resources</h3>
            <div className="space-y-3">
              <a 
                href="/docs" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                Documentation
              </a>
              <a 
                href="/api" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                API Reference
              </a>
              <a 
                href="/guides" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                WCAG Guides
              </a>
              <a 
                href="/changelog" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                Changelog
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Company</h3>
            <div className="space-y-3">
              <a 
                href="/about" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                About Us
              </a>
              <a 
                href="/privacy" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                Terms of Use
              </a>
              <a 
                href="/security" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                Security
              </a>
            </div>
          </div>

          {/* Global Access */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Global Access</h3>
            <p className="text-shaft-gray text-sm mb-4">
              AI accessibility tools can be accessed by a global audience, breaking down barriers to web compliance.
            </p>
            <div className="text-shaft-gray text-sm mb-4">
              <p className="font-medium text-shaft-black mb-2">Proud partner of the</p>
              <a 
                href="https://www.w3.org/WAI/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-shaft-gray hover:text-shaft-black transition-colors inline-flex items-center"
              >
                Web Accessibility Initiative (WAI)
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-shaft-black flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                <div className="bg-white w-full h-1.5"></div>
                <div className="bg-white w-full h-1"></div>
                <div className="bg-white w-full h-1"></div>
                <div className="bg-white w-full h-1.5"></div>
              </div>
            </div>
            <span className="text-xl font-semibold text-shaft-black">
              accessibility
            </span>
          </div>

          {/* Social Links */}
          <div className="flex space-x-4">
            <a 
              href="https://github.com/accessibility-scanner" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com/AccessibilityAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://linkedin.com/company/accessibility-scanner" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a 
              href="mailto:hello@accessibility-scanner.com"
              className="text-shaft-gray hover:text-shaft-black transition-colors"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center">
          <p className="text-shaft-gray text-sm">
            © 2025 Accessibility Scanner. Making the web accessible with AI.
          </p>
        </div>
      </div>
    </footer>
  );
}