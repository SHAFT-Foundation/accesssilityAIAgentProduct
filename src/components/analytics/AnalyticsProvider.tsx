'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ANALYTICS_CONFIG, updateConsent } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Check for existing consent on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('analytics_consent');
    if (savedConsent !== null) {
      const consent = savedConsent === 'true';
      setConsentGiven(consent);
      updateConsent(consent);
    } else {
      // Show consent banner if no previous choice
      setShowConsentBanner(true);
    }
  }, []);

  const handleConsentAccept = () => {
    setConsentGiven(true);
    setShowConsentBanner(false);
    localStorage.setItem('analytics_consent', 'true');
    updateConsent(true);
  };

  const handleConsentDecline = () => {
    setConsentGiven(false);
    setShowConsentBanner(false);
    localStorage.setItem('analytics_consent', 'false');
    updateConsent(false);
  };

  const handleConsentManage = () => {
    setShowConsentBanner(false);
    // Could open a more detailed consent management modal
    localStorage.setItem('analytics_consent', 'false');
    updateConsent(false);
  };

  const shouldLoadAnalytics = consentGiven === true && ANALYTICS_CONFIG.gtag.enabled;

  return (
    <>
      {/* Google Analytics 4 */}
      {shouldLoadAnalytics && ANALYTICS_CONFIG.gtag.id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.gtag.id}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                
                // Set default consent
                gtag('consent', 'default', {
                  analytics_storage: 'granted',
                  ad_storage: 'granted',
                  ad_user_data: 'granted',
                  ad_personalization: 'granted',
                });
                
                gtag('config', '${ANALYTICS_CONFIG.gtag.id}', {
                  page_title: document.title,
                  page_location: window.location.href,
                  anonymize_ip: true,
                  allow_google_signals: true,
                  send_page_view: true,
                });
              `,
            }}
          />
        </>
      )}

      {/* Google Tag Manager */}
      {shouldLoadAnalytics && ANALYTICS_CONFIG.gtm.id && (
        <>
          <Script
            id="google-tag-manager"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${ANALYTICS_CONFIG.gtm.id}');
              `,
            }}
          />
          {/* GTM NoScript fallback */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${ANALYTICS_CONFIG.gtm.id}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Facebook Pixel */}
      {shouldLoadAnalytics && ANALYTICS_CONFIG.facebook.pixelId && (
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              
              fbq('init', '${ANALYTICS_CONFIG.facebook.pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* LinkedIn Insight Tag */}
      {shouldLoadAnalytics && ANALYTICS_CONFIG.linkedin.partnerId && (
        <Script
          id="linkedin-insight"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id = "${ANALYTICS_CONFIG.linkedin.partnerId}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              
              (function(l) {
                if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q=[]}
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript";b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);})(window.lintrk);
            `,
          }}
        />
      )}

      {/* Cookie Consent Banner */}
      {showConsentBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  We use cookies to improve your experience
                </h3>
                <p className="text-sm text-gray-600">
                  We use analytics cookies to understand how you use our website and improve your experience. 
                  These help us provide better service and measure our marketing effectiveness.{' '}
                  <a href="/cookies" className="text-blue-600 hover:text-blue-700 underline">
                    Learn more about our cookie policy
                  </a>
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleConsentManage}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Manage Preferences
                </button>
                
                <button
                  onClick={handleConsentDecline}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Decline
                </button>
                
                <button
                  onClick={handleConsentAccept}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}