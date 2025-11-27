import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  ServerIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

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
      color: 'bg-green-500',
    },
    {
      name: 'Total Earned',
      value: balance?.totalEarned || 0,
      icon: ChartBarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Servers',
      value: servers?.length || 0,
      icon: ServerIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Account Age',
      value: user ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      suffix: ' days',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}{stat.suffix || ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/servers"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Manage Servers</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage your game servers</p>
          </a>
          <a
            href="/earn"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Earn Coins</h3>
            <p className="text-sm text-gray-600 mt-1">Complete tasks to earn coins</p>
          </a>
          <a
            href="/store"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Store</h3>
            <p className="text-sm text-gray-600 mt-1">Purchase resources and upgrades</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

