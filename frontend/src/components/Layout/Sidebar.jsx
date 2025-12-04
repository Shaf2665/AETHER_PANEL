import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  HomeIcon,
  ServerIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { branding } = useTheme();
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef(null);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Servers', href: '/servers', icon: ServerIcon, gradient: 'from-purple-500 to-pink-500' },
    { name: 'Earn Coins', href: '/earn', icon: CurrencyDollarIcon, gradient: 'from-emerald-500 to-teal-500' },
    { name: 'Store', href: '/store', icon: ShoppingBagIcon, gradient: 'from-amber-500 to-orange-500' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    };

    if (adminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adminDropdownOpen]);

  // Close dropdown when route changes
  useEffect(() => {
    setAdminDropdownOpen(false);
  }, [location.pathname]);

  const getNavGradient = (href) => {
    if (href === '/') return 'var(--theme-nav-dashboard)';
    if (href === '/servers') return 'var(--theme-nav-servers)';
    if (href === '/earn') return 'var(--theme-nav-earnCoins)';
    if (href === '/store') return 'var(--theme-nav-store)';
    if (href === '/admin' || href === '/admin/settings') return 'var(--theme-nav-admin)';
    return 'var(--theme-nav-active)';
  };

  const isAdminActive = location.pathname === '/admin' || location.pathname === '/admin/settings';

  return (
    <div 
      className="w-64 h-screen shadow-2xl relative flex flex-col"
      style={{ background: 'var(--theme-sidebar-bg)' }}
    >
      <div className="p-6 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {branding?.sidebarLogoUrl ? (
            <img
              src={branding.sidebarLogoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-contain shadow-lg"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h2 
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{ color: 'var(--theme-sidebar-text)' }}
            >
              {branding?.dashboardShortName || branding?.dashboardName || 'Aether'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {branding?.dashboardShortName 
                ? 'Dashboard' 
                : (branding?.dashboardName?.split(' ').slice(1).join(' ') || 'Dashboard')}
            </p>
          </div>
        </div>
      </div>
      <nav className="p-3 mt-4 overflow-y-auto flex-1 min-h-0">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl mb-2 transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-lg transform scale-105'
                  : 'hover:text-white'
              }`}
              style={{
                background: isActive ? getNavGradient(item.href) : 'transparent',
                color: isActive ? 'white' : 'var(--theme-sidebar-text)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--theme-sidebar-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {isActive && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full`}></div>
              )}
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : ''} transition-colors`} style={{ color: isActive ? 'white' : 'var(--theme-sidebar-text)' }} />
              <span className="relative z-10">{item.name}</span>
              {isActive && (
                <div className="absolute inset-0 bg-white/10 rounded-xl blur-sm"></div>
              )}
            </Link>
          );
        })}
        
        {/* Admin Panel with Dropdown */}
        {isAdmin && (
          <div className="relative mb-2" ref={adminDropdownRef}>
            <button
              onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
              aria-expanded={adminDropdownOpen}
              aria-haspopup="true"
              aria-label="Admin Panel menu"
              className={`group relative flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isAdminActive
                  ? 'text-white shadow-lg transform scale-105'
                  : 'hover:text-white'
              }`}
              style={{
                background: isAdminActive ? getNavGradient('/admin') : 'transparent',
                color: isAdminActive ? 'white' : 'var(--theme-sidebar-text)',
              }}
              onMouseEnter={(e) => {
                if (!isAdminActive) {
                  e.currentTarget.style.background = 'var(--theme-sidebar-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAdminActive && !adminDropdownOpen) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div className="flex items-center">
                {isAdminActive && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full`}></div>
                )}
                <ShieldCheckIcon className={`mr-3 h-5 w-5 ${isAdminActive ? 'text-white' : ''} transition-colors`} style={{ color: isAdminActive ? 'white' : 'var(--theme-sidebar-text)' }} />
                <span className="relative z-10">Admin Panel</span>
                {isAdminActive && (
                  <div className="absolute inset-0 bg-white/10 rounded-xl blur-sm"></div>
                )}
              </div>
              <ChevronDownIcon 
                className={`h-4 w-4 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`}
                style={{ color: isAdminActive ? 'white' : 'var(--theme-sidebar-text)' }}
              />
            </button>
            
            {adminDropdownOpen && (
              <div className="mt-1 ml-4 space-y-1" role="menu" aria-label="Admin Panel submenu">
                <Link
                  to="/admin"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    location.pathname === '/admin'
                      ? 'text-white shadow-md'
                      : 'hover:text-white'
                  }`}
                  style={{
                    background: location.pathname === '/admin' ? 'var(--theme-nav-admin)' : 'var(--theme-sidebar-hover)',
                    color: location.pathname === '/admin' ? 'white' : 'var(--theme-sidebar-text)',
                  }}
                  onClick={() => setAdminDropdownOpen(false)}
                >
                  <ChartBarIcon className="mr-3 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/admin/settings"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    location.pathname === '/admin/settings'
                      ? 'text-white shadow-md'
                      : 'hover:text-white'
                  }`}
                  style={{
                    background: location.pathname === '/admin/settings' ? 'var(--theme-nav-admin)' : 'var(--theme-sidebar-hover)',
                    color: location.pathname === '/admin/settings' ? 'white' : 'var(--theme-sidebar-text)',
                  }}
                  onClick={() => setAdminDropdownOpen(false)}
                >
                  <Cog6ToothIcon className="mr-3 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
      
      {/* Decorative gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none z-0"></div>
    </div>
  );
};

export default Sidebar;

