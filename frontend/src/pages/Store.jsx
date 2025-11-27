import React from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { 
  CpuChipIcon, 
  CircleStackIcon, 
  ServerIcon 
} from '@heroicons/react/24/outline';

const Store = () => {
  const { data: pricing } = useQuery('pricing', async () => {
    const res = await api.get('/resources/pricing');
    return res.data;
  });

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  });

  const resources = [
    {
      name: 'CPU',
      icon: CpuChipIcon,
      description: 'Processing power for your server',
      pricing: pricing?.cpu,
      color: 'bg-blue-500',
    },
    {
      name: 'Memory (RAM)',
      icon: CircleStackIcon,
      description: 'Memory allocation for your server',
      pricing: pricing?.memory,
      color: 'bg-green-500',
    },
    {
      name: 'Disk Space',
      icon: ServerIcon,
      description: 'Storage space for your server',
      pricing: pricing?.disk,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resource Store</h1>
        <p className="text-gray-600">Purchase resources to power your game servers</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Available Coins</p>
            <p className="text-3xl font-bold text-gray-900">{balance?.coins || 0}</p>
          </div>
          <a
            href="/earn"
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Earn More Coins
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <div key={resource.name} className="bg-white rounded-lg shadow p-6">
            <div className={`${resource.color} p-3 rounded-lg w-fit mb-4`}>
              <resource.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{resource.name}</h3>
            <p className="text-gray-600 mb-4">{resource.description}</p>
            <div className="space-y-2 mb-4">
              {resource.pricing && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">One-time:</span>
                    <span className="font-medium">
                      {resource.name === 'CPU' && `${resource.pricing.per_core} coins/core`}
                      {resource.name === 'Memory (RAM)' && `${resource.pricing.per_gb} coins/GB`}
                      {resource.name === 'Disk Space' && `${resource.pricing.per_gb} coins/GB`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Hourly:</span>
                    <span className="font-medium">{resource.pricing.per_hour} coins/hour</span>
                  </div>
                </>
              )}
            </div>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Purchase {resource.name}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Server Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Minecraft Server</h3>
            <p className="text-sm text-gray-600 mb-4">2 CPU cores, 2GB RAM, 10GB Disk</p>
            <p className="text-lg font-semibold text-blue-600 mb-2">500 coins</p>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Deploy
            </button>
          </div>
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">FiveM Server</h3>
            <p className="text-sm text-gray-600 mb-4">4 CPU cores, 4GB RAM, 20GB Disk</p>
            <p className="text-lg font-semibold text-blue-600 mb-2">1000 coins</p>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Deploy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Store;

