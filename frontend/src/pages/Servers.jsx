import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  ServerIcon, 
  PlusIcon, 
  XMarkIcon,
  CpuChipIcon,
  CircleStackIcon,
  HardDriveIcon,
  CheckCircleIcon,
  TrashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

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
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const estimatedCost = calculateCost();

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
            My Servers
          </h1>
          <p className="text-gray-600">Manage and monitor your game servers</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Server
        </button>
      </div>

      {/* Create Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create New Server
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-1 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="My Awesome Server"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Game Type
                  </label>
                  <select
                    value={formData.game_type}
                    onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="minecraft">Minecraft</option>
                    <option value="fivem">FiveM</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CPU Limit (%)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.cpu_limit}
                      onChange={(e) => setFormData({ ...formData, cpu_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">100% = 1 core</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Memory (MB)
                    </label>
                    <input
                      type="number"
                      required
                      min="512"
                      step="512"
                      value={formData.memory_limit}
                      onChange={(e) => setFormData({ ...formData, memory_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Min: 512 MB</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Disk (MB)
                    </label>
                    <input
                      type="number"
                      required
                      min="1024"
                      step="1024"
                      value={formData.disk_limit}
                      onChange={(e) => setFormData({ ...formData, disk_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Min: 1024 MB</p>
                  </div>
                </div>

                {pricing && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-700">Estimated Cost:</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {estimatedCost} coins
                      </span>
                    </div>
                    {balance && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Your Balance:</span>
                        <span className={`font-semibold ${balance.coins >= estimatedCost ? 'text-green-600' : 'text-red-600'}`}>
                          {balance.coins} coins
                        </span>
                      </div>
                    )}
                    {balance && balance.coins < estimatedCost && (
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        ⚠️ Insufficient coins. You need {estimatedCost - balance.coins} more coins.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createServerMutation.isLoading || (balance && balance.coins < estimatedCost)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform transition-all duration-200 hover:scale-105 font-medium"
                >
                  {createServerMutation.isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Server'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <div 
              key={server.id} 
              className="group bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-2xl p-6 border border-gray-200 transform transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg mr-3">
                    <ServerIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{server.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{server.game_type}</p>
                  </div>
                </div>
                {server.status === 'active' && (
                  <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">Active</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CpuChipIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">CPU</span>
                  </div>
                  <span className="font-semibold text-gray-900">{server.cpu_limit}%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CircleStackIcon className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-gray-600">RAM</span>
                  </div>
                  <span className="font-semibold text-gray-900">{(server.memory_limit / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <HardDriveIcon className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-gray-600">Disk</span>
                  </div>
                  <span className="font-semibold text-gray-900">{(server.disk_limit / 1024).toFixed(1)} GB</span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md">
                  <Cog6ToothIcon className="h-4 w-4 mr-1" />
                  Manage
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-12 text-center border border-gray-200">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ServerIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No servers yet</h3>
          <p className="text-gray-600 mb-6">Create your first game server to get started</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 shadow-lg transform transition-all duration-200 hover:scale-105 font-medium"
          >
            <PlusIcon className="h-5 w-5 inline mr-2" />
            Create Server
          </button>
        </div>
      )}
    </div>
  );
};

export default Servers;

