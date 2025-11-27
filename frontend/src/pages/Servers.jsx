import React from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { ServerIcon, PlusIcon } from '@heroicons/react/24/outline';

const Servers = () => {
  const { data: servers, isLoading } = useQuery('servers', async () => {
    const res = await api.get('/servers');
    return res.data;
  });

  if (isLoading) {
    return <div>Loading servers...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Servers</h1>
        <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Server
        </button>
      </div>

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
          <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Create Server
          </button>
        </div>
      )}
    </div>
  );
};

export default Servers;

