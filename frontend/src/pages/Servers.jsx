import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ServerIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Servers = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    game_type: 'minecraft',
    cpu_limit: 100,
    memory_limit: 2048,
    disk_limit: 10240,
  });

  const { data: servers, isLoading } = useQuery('servers', async () => {
    const res = await api.get('/servers');
    return res.data;
  });

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  });

  const { data: pricing } = useQuery('pricing', async () => {
    const res = await api.get('/resources/pricing');
    return res.data;
  });

  // Calculate estimated cost
  const calculateCost = () => {
    if (!pricing) return 0;
    const cpuCost = Math.ceil(formData.cpu_limit / 100) * pricing.cpu.per_core;
    const memoryCost = Math.ceil(formData.memory_limit / 1024) * pricing.memory.per_gb;
    const diskCost = Math.ceil(formData.disk_limit / 1024) * pricing.disk.per_gb;
    return cpuCost + memoryCost + diskCost + 500; // Base fee
  };

  const createServerMutation = useMutation(
    async (data) => {
      const res = await api.post('/servers/create', data);
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Server "${data.server.name}" created successfully!`);
        queryClient.invalidateQueries('servers');
        queryClient.invalidateQueries('balance');
        setIsModalOpen(false);
        setFormData({
          name: '',
          game_type: 'minecraft',
          cpu_limit: 100,
          memory_limit: 2048,
          disk_limit: 10240,
        });
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to create server';
        toast.error(message);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const cost = calculateCost();
    if (balance && balance.coins < cost) {
      toast.error(`Insufficient coins. Required: ${cost}, Available: ${balance.coins}`);
      return;
    }
    createServerMutation.mutate(formData);
  };

  if (isLoading) {
    return <div>Loading servers...</div>;
  }

  const estimatedCost = calculateCost();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Servers</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Server
        </button>
      </div>

      {/* Create Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create New Server</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Awesome Server"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Game Type
                  </label>
                  <select
                    value={formData.game_type}
                    onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="minecraft">Minecraft</option>
                    <option value="fivem">FiveM</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPU Limit (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.cpu_limit}
                    onChange={(e) => setFormData({ ...formData, cpu_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">100% = 1 CPU core</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memory Limit (MB)
                  </label>
                  <input
                    type="number"
                    required
                    min="512"
                    step="512"
                    value={formData.memory_limit}
                    onChange={(e) => setFormData({ ...formData, memory_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: 512 MB</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disk Limit (MB)
                  </label>
                  <input
                    type="number"
                    required
                    min="1024"
                    step="1024"
                    value={formData.disk_limit}
                    onChange={(e) => setFormData({ ...formData, disk_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: 1024 MB (1 GB)</p>
                </div>

                {pricing && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Estimated Cost:</span>
                      <span className="text-2xl font-bold text-blue-600">{estimatedCost} coins</span>
                    </div>
                    {balance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Your Balance:</span>
                        <span className={`font-medium ${balance.coins >= estimatedCost ? 'text-green-600' : 'text-red-600'}`}>
                          {balance.coins} coins
                        </span>
                      </div>
                    )}
                    {balance && balance.coins < estimatedCost && (
                      <p className="text-sm text-red-600 mt-2">
                        Insufficient coins. You need {estimatedCost - balance.coins} more coins.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createServerMutation.isLoading || (balance && balance.coins < estimatedCost)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createServerMutation.isLoading ? 'Creating...' : 'Create Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <div key={server.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <ServerIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">{server.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{server.game_type}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU:</span>
                  <span className="font-medium">{server.cpu_limit}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RAM:</span>
                  <span className="font-medium">{server.memory_limit} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Disk:</span>
                  <span className="font-medium">{server.disk_limit} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium capitalize ${
                    server.status === 'active' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {server.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Manage
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ServerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No servers yet</h3>
          <p className="text-gray-600 mb-4">Create your first game server to get started</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Server
          </button>
        </div>
      )}
    </div>
  );
};

export default Servers;

