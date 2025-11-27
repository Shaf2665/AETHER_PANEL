import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ServerIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Servers', href: '/servers', icon: ServerIcon },
    { name: 'Earn Coins', href: '/earn', icon: CurrencyDollarIcon },
    { name: 'Store', href: '/store', icon: ShoppingBagIcon },
  ];

  return (
    <div className="w-64 bg-gray-900 min-h-screen">
      <div className="p-6">
        <h2 className="text-white text-xl font-bold">Aether Dashboard</h2>
      </div>
      <nav className="px-3">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;

