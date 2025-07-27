'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/lib/supabase';

interface WaitlistFormProps {
  source?: string;
  className?: string;
  placeholder?: string;
  buttonText?: string;
  showCount?: boolean;
}

export function WaitlistForm({ 
  source = 'unknown', 
  className = '',
  placeholder = 'Enter your email',
  buttonText = 'Join Waitlist',
  showCount = false
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const analytics = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setStatus('loading');
    setErrorMessage('');
    
    try {
      console.log('Submitting to waitlist with supabase config:', {
        url: supabase.supabaseUrl,
        hasKey: !!supabase.supabaseKey
      });
      
      const { error } = await supabase
        .from('waitlist')
        .insert([
          { 
            email,
            source,
            metadata: {
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              timestamp: new Date().toISOString(),
            }
          }
        ]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setStatus('error');
          setErrorMessage('Email already registered!');
        } else {
          throw error;
        }
      } else {
        setStatus('success');
        setEmail('');
        analytics.clickCTA('waitlist_signup', source);
        
        // Fetch updated count if showing count
        if (showCount) {
          fetchWaitlistCount();
        }
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setErrorMessage(`Error: ${error.message || 'Network error. Please try again.'}`);
    }
  };

  const fetchWaitlistCount = async () => {
    try {
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setWaitlistCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch waitlist count:', error);
    }
  };

  // Fetch count on mount if needed
  useEffect(() => {
    if (showCount) {
      fetchWaitlistCount();
    }
  }, [showCount]);

  if (status === 'success') {
    return (
      <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">
          You're on the waitlist! We'll notify you when we launch.
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-shaft-red hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shaft-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {status === 'loading' ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {buttonText}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      </form>
      
      {status === 'error' && (
        <div className="mt-2 flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}
      
      {showCount && waitlistCount !== null && (
        <p className="mt-2 text-xs text-gray-500">
          {waitlistCount.toLocaleString()} people already on the waitlist
        </p>
      )}
    </div>
  );
}
