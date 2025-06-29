'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FolderGit2,
  ScanLine,
  AlertTriangle,
  GitPullRequest,
  BarChart3,
  Settings,
  User,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Shield,
  Clock,
  Activity,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
  children?: NavigationItem[];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeScans: 0,
    openIssues: 0,
    openPRs: 0,
  });

  const router = useRouter();
  const pathname = usePathname();
  const analytics = useAnalytics();

  // Mock user data - replace with actual API call
  useEffect(() => {
    setUser({
      name: 'Demo User',
      email: 'demo@accessibility-scanner.com',
      avatarUrl: null,
      subscription: 'PRO',
      prQuota: 50,
      prUsed: 12,
    });

    setNotifications([
      {
        id: '1',
        type: 'scan_completed',
        title: 'Scan completed for my-awesome-website',
        message: '15 issues found, 3 critical',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
      },
      {
        id: '2',
        type: 'pr_created',
        title: 'Pull request created',
        message: 'Fix accessibility issues #42',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
      },
    ]);

    setStats({
      activeScans: 2,
      openIssues: 23,
      openPRs: 4,
    });
  }, []);

  const navigation: NavigationItem[] = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Repositories',
      href: '/dashboard/repositories',
      icon: FolderGit2,
      badge: '3',
    },
    {
      name: 'Scans',
      href: '/dashboard/scans',
      icon: ScanLine,
      badge: stats.activeScans > 0 ? stats.activeScans : undefined,
      children: [
        {
          name: 'All Scans',
          href: '/dashboard/scans',
          icon: ScanLine,
        },
        {
          name: 'Active Scans',
          href: '/dashboard/scans?status=processing',
          icon: Activity,
          badge: stats.activeScans,
        },
        {
          name: 'Completed',
          href: '/dashboard/scans?status=completed',
          icon: Shield,
        },
      ],
    },
    {
      name: 'Issues',
      href: '/dashboard/issues',
      icon: AlertTriangle,
      badge: stats.openIssues > 0 ? stats.openIssues : undefined,
      children: [
        {
          name: 'All Issues',
          href: '/dashboard/issues',
          icon: AlertTriangle,
        },
        {
          name: 'Critical',
          href: '/dashboard/issues?severity=critical',
          icon: AlertTriangle,
        },
        {
          name: 'Open',
          href: '/dashboard/issues?status=open',
          icon: Clock,
          badge: stats.openIssues,
        },
      ],
    },
    {
      name: 'Pull Requests',
      href: '/dashboard/pull-requests',
      icon: GitPullRequest,
      badge: stats.openPRs > 0 ? stats.openPRs : undefined,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (item: NavigationItem) => {
    analytics.track('dashboard_navigation', {
      page: item.href,
      name: item.name,
    });
  };

  const handleLogout = () => {
    analytics.track('logout_initiated', { source: 'dashboard' });
    // Implement logout logic
    router.push('/auth/login');
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} pathname={pathname} onNavClick={handleNavClick} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} pathname={pathname} onNavClick={handleNavClick} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between">
            {/* Search bar placeholder */}
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    {/* Search icon placeholder */}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side items */}
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <div className="relative">
                <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* User menu */}
              <div className="ml-3 relative">
                <div>
                  <button
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="flex items-center">
                      {user?.avatarUrl ? (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={user.avatarUrl}
                          alt={user.name}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <span className="ml-2 text-gray-700 font-medium">{user?.name}</span>
                      <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                </div>

                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b">
                        <div>{user?.email}</div>
                        <div className="text-xs">{user?.subscription} Plan</div>
                      </div>
                      <Link
                        href="/dashboard/settings/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile Settings
                      </Link>
                      <Link
                        href="/dashboard/settings/billing"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Billing
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="inline w-4 h-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ 
  navigation, 
  pathname, 
  onNavClick 
}: { 
  navigation: NavigationItem[]; 
  pathname: string;
  onNavClick: (item: NavigationItem) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (href: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-600">
        <Shield className="h-8 w-8 text-white" />
        <span className="ml-2 text-white font-bold text-lg">AI Access</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  onClick={() => onNavClick(item)}
                  className={`flex-1 group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-blue-100 text-blue-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
                {item.children && (
                  <button
                    onClick={() => toggleExpanded(item.href)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <ChevronDown 
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedItems.has(item.href) ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
              
              {item.children && expandedItems.has(item.href) && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      onClick={() => onNavClick(child)}
                      className={`group flex items-center px-2 py-1 text-sm rounded-md ${
                        isActive(child.href)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <child.icon className="mr-2 h-4 w-4" />
                      {child.name}
                      {child.badge && (
                        <span className="ml-auto inline-block py-0.5 px-1.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Quota indicator */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">PR Quota</span>
              <span className="font-medium">12/50</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: '24%' }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">Resets monthly</div>
          </div>
        </div>
      </div>
    </div>
  );
}