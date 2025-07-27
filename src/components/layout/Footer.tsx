'use client';

import { Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              <a 
                href="mailto:argos@shaft.finance" 
                className="text-shaft-gray hover:text-shaft-black text-sm block transition-colors"
              >
                argos@shaft.finance
              </a>
              <div className="text-shaft-gray text-sm">
                <p>SHAFT Foundation</p>
                <p>Calle 50, Edificio Oceania, Piso 12,</p>
                <p>Oficina 1203</p>
                <p>Bella Vista Ciudad de Panamá</p>
                <p>Panamá</p>
              </div>
            </div>
          </div>

          {/* Global Access */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Global Access</h3>
            <p className="text-shaft-gray text-sm mb-4">
              Open Source AI Speech agents can be accessed by a global audience, breaking down geographical barriers. This opens up investment opportunities to a broader range of investors who may not have had access to certain markets or assets through traditional means.
            </p>
          </div>

          {/* Partnership */}
          <div>
            <h3 className="text-shaft-black font-semibold mb-4">Proud partner of the DAIAA</h3>
            <p className="text-shaft-gray text-sm mb-4">
              learn more at
            </p>
            <a 
              href="https://www.daiaa.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors inline-flex items-center text-sm"
            >
              (https://www.daiaa.org/)
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start">
          {/* Social Links */}
          <div className="flex space-x-3 mb-6 md:mb-0">
            <a 
              href="https://www.instagram.com/shaft.foundation/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a 
              href="https://www.youtube.com/@shaftfoundation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a 
              href="https://www.linkedin.com/company/shaft-foundation/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com/shaft_foundation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a 
              href="https://github.com/SHAFT-Foundation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <Github className="h-5 w-5" />
            </a>
            <a 
              href="https://discord.gg/shaft" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a 
              href="https://t.me/shaftfoundation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-shaft-gray hover:text-shaft-black transition-colors p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
          </div>

          {/* Logo and shaft.finance */}
          <div className="flex items-center space-x-3">
            <img 
              src="/Artboard 46.avif" 
              alt="Shaft Foundation Logo" 
              className="w-12 h-12 object-contain"
            />
            <div className="text-2xl font-bold text-shaft-black">shaft</div>
          </div>
        </div>
      </div>
    </footer>
  );
}