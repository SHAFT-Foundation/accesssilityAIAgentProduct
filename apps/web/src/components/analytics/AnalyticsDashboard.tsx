'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, MousePointer, TrendingUp, Eye, Clock } from 'lucide-react';

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  averageTimeOnSite: string;
  topPages: { page: string; views: number }[];
  events: { event: string; count: number; timestamp: string }[];
}

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    pageViews: 0,
    uniqueVisitors: 0,
    conversionRate: 0,
    averageTimeOnSite: '0:00',
    topPages: [],
    events: [],
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Mock analytics data for demo
    setAnalyticsData({
      pageViews: 1247,
      uniqueVisitors: 892,
      conversionRate: 3.2,
      averageTimeOnSite: '2:34',
      topPages: [
        { page: '/', views: 567 },
        { page: '/pricing', views: 234 },
        { page: '/features', views: 189 },
        { page: '/security', views: 156 },
        { page: '/onboarding', views: 101 },
      ],
      events: [
        { event: 'CTA Click - Start Free', count: 89, timestamp: '2 hours ago' },
        { event: 'Plan Selected - Pro', count: 34, timestamp: '1 hour ago' },
        { event: 'Demo Viewed', count: 156, timestamp: '30 minutes ago' },
        { event: 'Repository Connected', count: 23, timestamp: '15 minutes ago' },
        { event: 'Scan Completed', count: 18, timestamp: '5 minutes ago' },
      ],
    });
  }, []);

  if (!isClient) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
        <div className="flex items-center text-sm text-gray-500">
          <BarChart3 className="w-4 h-4 mr-1" />
          Real-time data
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Eye className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">Page Views</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            {analyticsData.pageViews.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700 mt-1">+12% from last week</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">Unique Visitors</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-2">
            {analyticsData.uniqueVisitors.toLocaleString()}
          </div>
          <div className="text-xs text-green-700 mt-1">+8% from last week</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-900">Conversion Rate</span>
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-2">
            {analyticsData.conversionRate}%
          </div>
          <div className="text-xs text-purple-700 mt-1">+0.3% from last week</div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-900">Avg. Time on Site</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 mt-2">
            {analyticsData.averageTimeOnSite}
          </div>
          <div className="text-xs text-orange-700 mt-1">+15s from last week</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Top Pages</h4>
          <div className="space-y-3">
            {analyticsData.topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 mr-2">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-900">{page.page}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(page.views / analyticsData.topPages[0].views) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                    {page.views}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Events</h4>
          <div className="space-y-3">
            {analyticsData.events.map((event, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{event.event}</div>
                  <div className="text-xs text-gray-500">{event.timestamp}</div>
                </div>
                <div className="flex items-center">
                  <MousePointer className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">{event.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Tools Status */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Analytics Tools Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-sm text-gray-700">Google Analytics</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-sm text-gray-700">Google Tag Manager</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-sm text-gray-700">Facebook Pixel</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-sm text-gray-700">LinkedIn Insight</span>
          </div>
        </div>
      </div>
    </div>
  );
}