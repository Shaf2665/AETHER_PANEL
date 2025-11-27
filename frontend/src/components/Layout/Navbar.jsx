import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';
import { useQuery } from 'react-query';
import api from '../../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  }, { refetchInterval: 30000 });

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Aether Dashboard</h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">
                {balance?.coins || 0} coins
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

