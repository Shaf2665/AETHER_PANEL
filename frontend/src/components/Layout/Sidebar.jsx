import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  ServerIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Servers', href: '/servers', icon: ServerIcon, gradient: 'from-purple-500 to-pink-500' },
    { name: 'Earn Coins', href: '/earn', icon: CurrencyDollarIcon, gradient: 'from-emerald-500 to-teal-500' },
    { name: 'Store', href: '/store', icon: ShoppingBagIcon, gradient: 'from-amber-500 to-orange-500' },
  ];

  // Add admin panel link if user is admin
  if (isAdmin) {
    navigation.push({
      name: 'Admin Panel',
      href: '/admin',
      icon: ShieldCheckIcon,
      gradient: 'from-red-500 to-rose-500',
    });
  }

  const getNavGradient = (href) => {
    if (href === '/') return 'var(--theme-nav-dashboard)';
    if (href === '/servers') return 'var(--theme-nav-servers)';
    if (href === '/earn') return 'var(--theme-nav-earnCoins)';
    if (href === '/store') return 'var(--theme-nav-store)';
    if (href === '/admin') return 'var(--theme-nav-admin)';
    return 'var(--theme-nav-active)';
  };

  return (
    <div 
      className="w-64 h-screen shadow-2xl relative flex flex-col"
      style={{ background: 'var(--theme-sidebar-bg)' }}
    >
      <div className="p-6 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{ color: 'var(--theme-sidebar-text)' }}
            >
              Aether
            </h2>
            <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>Dashboard</p>
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
      </nav>
      
      {/* Decorative gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none z-0"></div>
    </div>
  );
};

export default Sidebar;

