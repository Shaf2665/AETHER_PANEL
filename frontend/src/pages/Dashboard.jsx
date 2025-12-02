import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  ServerIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Animated counter component
const AnimatedCounter = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{Math.floor(displayValue)}{suffix}</>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { theme: themeSettings } = useTheme();

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  });

  const { data: servers } = useQuery('servers', async () => {
    const res = await api.get('/servers');
    return res.data;
  });

  const stats = [
    {
      name: 'Total Coins',
      value: balance?.coins || 0,
      icon: CurrencyDollarIcon,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      name: 'Total Earned',
      value: balance?.totalEarned || 0,
      icon: ChartBarIcon,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      name: 'Active Servers',
      value: servers?.length || 0,
      icon: ServerIcon,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    },
    {
      name: 'Account Age',
      value: user ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      suffix: ' days',
    },
  ];

  const quickActions = [
    {
      name: 'Manage Servers',
      description: 'View and manage your game servers',
      href: '/servers',
      icon: ServerIcon,
      gradient: 'from-blue-500 to-cyan-600',
      hoverGradient: 'hover:from-blue-600 hover:to-cyan-700',
    },
    {
      name: 'Earn Coins',
      description: 'Complete tasks to earn coins',
      href: '/earn',
      icon: SparklesIcon,
      gradient: 'from-emerald-500 to-green-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-green-700',
    },
    {
      name: 'Store',
      description: 'Purchase resources and upgrades',
      href: '/store',
      icon: Cog6ToothIcon,
      gradient: 'from-purple-500 to-pink-600',
      hoverGradient: 'hover:from-purple-600 hover:to-pink-700',
    },
  ];

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: 'var(--theme-background)',
        backgroundImage: 'var(--theme-background-image)',
        backgroundPosition: 'var(--theme-background-position)',
        backgroundSize: 'var(--theme-background-size)',
        backgroundRepeat: 'var(--theme-background-repeat)',
        position: 'relative'
      }}
    >
      {themeSettings?.background?.image && (
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: themeSettings.background.overlay,
            zIndex: -1
          }}
        />
      )}
      <div className="mb-8">
        <h1 
          className="text-4xl font-bold bg-clip-text text-transparent mb-2"
          style={{ 
            background: 'linear-gradient(to right, var(--theme-text-primary), var(--theme-primary), var(--theme-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--theme-text-secondary)' }}>Welcome back, {user?.username || 'User'}! Here's your overview.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/50"
            style={{ background: 'var(--theme-card-bg)' }}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>{stat.name}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                </p>
              </div>
              <div className={`${stat.iconBg} p-4 rounded-xl shadow-lg`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div 
        className="backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50"
        style={{ background: 'var(--theme-card-bg)' }}
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--theme-text-primary)' }}>
          <SparklesIcon className="h-6 w-6 mr-2 text-purple-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className={`group relative bg-gradient-to-br ${action.gradient} ${action.hoverGradient} rounded-xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden`}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <action.icon className="h-8 w-8" />
                  <ArrowRightIcon className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-xl font-bold mb-2">{action.name}</h3>
                <p className="text-white/90 text-sm">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

