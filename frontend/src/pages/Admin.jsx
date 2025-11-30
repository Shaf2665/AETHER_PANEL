import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  UsersIcon,
  ServerIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Admin = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stats');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserModal, setEditUserModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [coinAdjustmentModal, setCoinAdjustmentModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState(0);
  const [coinDescription, setCoinDescription] = useState('');
  const [pterodactylSettings, setPterodactylSettings] = useState({
    url: '',
    apiKey: '',
    clientApiKey: '',
    applicationApiKey: '',
    nodeId: 1,
    nestId: 1,
    eggIdMinecraft: 1,
    eggIdFivem: 2,
    eggIdOther: 1,
    defaultUserId: 1,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading } = useQuery('adminStats', async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery(
    ['adminUsers', userPage, userSearch, userRoleFilter],
    async () => {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: '20',
      });
      if (userSearch) params.append('search', userSearch);
      if (userRoleFilter) params.append('role', userRoleFilter);
      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    }
  );

  // Fetch servers
  const { data: serversData, isLoading: serversLoading } = useQuery(
    ['adminServers', 1],
    async () => {
      const res = await api.get('/admin/servers?page=1&limit=50');
      return res.data;
    }
  );

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    ['adminTransactions', 1],
    async () => {
      const res = await api.get('/admin/transactions?page=1&limit=50');
      return res.data;
    }
  );

  // Fetch revenue
  const { data: revenueData, isLoading: revenueLoading } = useQuery('adminRevenue', async () => {
    const res = await api.get('/admin/revenue');
    return res.data;
  });

  // Update user mutation
  const updateUserMutation = useMutation(
    async ({ userId, data }) => {
      const res = await api.put(`/admin/users/${userId}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('User updated successfully');
        queryClient.invalidateQueries('adminUsers');
        setEditUserModal(false);
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user');
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (userId) => {
      const res = await api.delete(`/admin/users/${userId}`);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries('adminUsers');
        queryClient.invalidateQueries('adminStats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete user');
      },
    }
  );

  // Adjust coins mutation
  const adjustCoinsMutation = useMutation(
    async ({ userId, amount, description }) => {
      const res = await api.post(`/admin/users/${userId}/coins`, { amount, description });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Coins adjusted successfully');
        queryClient.invalidateQueries('adminUsers');
        queryClient.invalidateQueries('adminStats');
        setCoinAdjustmentModal(false);
        setCoinAmount(0);
        setCoinDescription('');
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to adjust coins');
      },
    }
  );

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      coins: user.coins,
    });
    setEditUserModal(true);
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleAdjustCoins = (user) => {
    setSelectedUser(user);
    setCoinAdjustmentModal(true);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    updateUserMutation.mutate({ userId: selectedUser.id, data: editFormData });
  };

  const handleSubmitCoinAdjustment = (e) => {
    e.preventDefault();
    adjustCoinsMutation.mutate({
      userId: selectedUser.id,
      amount: parseFloat(coinAmount),
      description: coinDescription,
    });
  };

  // Fetch Pterodactyl settings
  const { data: pterodactylData, isLoading: pterodactylLoading, refetch: refetchPterodactyl } = useQuery(
    'pterodactylSettings',
    async () => {
      const res = await api.get('/admin/settings/pterodactyl');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setPterodactylSettings({
          url: data.url || '',
          apiKey: data.apiKey || '',
          clientApiKey: data.clientApiKey || '',
          applicationApiKey: data.applicationApiKey || '',
          nodeId: data.nodeId || 1,
          nestId: data.nestId || 1,
          eggIdMinecraft: data.eggIds?.minecraft || 1,
          eggIdFivem: data.eggIds?.fivem || 2,
          eggIdOther: data.eggIds?.other || 1,
          defaultUserId: data.defaultUserId || 1,
        });
      },
    }
  );

  // Update Pterodactyl settings mutation
  const updatePterodactylMutation = useMutation(
    async (data) => {
      const res = await api.put('/admin/settings/pterodactyl', data);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Pterodactyl settings updated successfully');
        refetchPterodactyl();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update settings');
      },
    }
  );

  const handlePterodactylSubmit = (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    updatePterodactylMutation.mutate(pterodactylSettings, {
      onSettled: () => {
        setSettingsLoading(false);
      },
    });
  };

  const tabs = [
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
    { id: 'users', name: 'Users', icon: UsersIcon },
    { id: 'servers', name: 'Servers', icon: ServerIcon },
    { id: 'transactions', name: 'Transactions', icon: CurrencyDollarIcon },
    { id: 'revenue', name: 'Revenue', icon: ArrowTrendingUpIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-purple-100">Manage users, servers, and system statistics</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div>
              {statsLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* User Statistics */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">User Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div className="text-sm text-blue-600 font-medium">Total Users</div>
                        <div className="text-3xl font-bold text-blue-900 mt-2">{stats.users.total}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-purple-600 font-medium">Admins</div>
                        <div className="text-3xl font-bold text-purple-900 mt-2">{stats.users.admins}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <div className="text-sm text-green-600 font-medium">Active (24h)</div>
                        <div className="text-3xl font-bold text-green-900 mt-2">{stats.users.active24h}</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <div className="text-sm text-orange-600 font-medium">New (Today)</div>
                        <div className="text-3xl font-bold text-orange-900 mt-2">{stats.users.newToday}</div>
                      </div>
                    </div>
                  </div>

                  {/* Server Statistics */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Server Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                        <div className="text-sm text-indigo-600 font-medium">Total Servers</div>
                        <div className="text-3xl font-bold text-indigo-900 mt-2">{stats.servers.total}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-600 font-medium mb-2">Servers by Type</div>
                        <div className="space-y-1">
                          {Object.entries(stats.servers.byType || {}).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">{type}</span>
                              <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coin Statistics */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Coin Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                        <div className="text-sm text-yellow-600 font-medium">In Circulation</div>
                        <div className="text-3xl font-bold text-yellow-900 mt-2">
                          {stats.coins.inCirculation.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                        <div className="text-sm text-amber-600 font-medium">Total Earned</div>
                        <div className="text-3xl font-bold text-amber-900 mt-2">
                          {stats.coins.totalEarned.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Search and Filter */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : usersData ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coins
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usersData.users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {parseFloat(user.coins).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleAdjustCoins(user)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Adjust Coins"
                                >
                                  <CurrencyDollarIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {usersData.pagination && usersData.pagination.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing page {usersData.pagination.page} of {usersData.pagination.totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                          disabled={userPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setUserPage((p) => p + 1)}
                          disabled={userPage >= usersData.pagination.totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Servers Tab */}
          {activeTab === 'servers' && (
            <div>
              {serversLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : serversData ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Game Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resources
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serversData.servers.map((server) => (
                        <tr key={server.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{server.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{server.username || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 capitalize">{server.game_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              CPU: {server.cpu_limit}% | RAM: {(server.memory_limit / 1024).toFixed(1)}GB | Disk:{' '}
                              {(server.disk_limit / 1024).toFixed(1)}GB
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                server.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {server.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(server.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactionsLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : transactionsData ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionsData.transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{transaction.username || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.type === 'earned'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.type === 'spent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`text-sm font-medium ${
                                transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.type === 'earned' ? '+' : '-'}
                              {parseFloat(transaction.amount).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{transaction.source || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{transaction.description || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div>
              {revenueLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : revenueData ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="text-sm text-green-600 font-medium">Total Revenue</div>
                    <div className="text-4xl font-bold text-green-900 mt-2">
                      {revenueData.total.toLocaleString()} coins
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Revenue by Source</h3>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Source
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData.bySource.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 capitalize">{item.source}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{item.count}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {item.total.toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Earners</h3>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Total Earned
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData.topEarners.map((earner) => (
                            <tr key={earner.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{earner.username}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {earner.totalEarned.toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              {pterodactylLoading ? (
                <div className="flex justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Pterodactyl Panel Configuration</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Configure your Pterodactyl Panel API keys and settings. These settings are required for server creation and management.
                    </p>

                    <form onSubmit={handlePterodactylSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pterodactyl Panel URL
                          </label>
                          <input
                            type="url"
                            value={pterodactylSettings.url}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, url: e.target.value })}
                            placeholder="https://panel.example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                          <p className="mt-1 text-sm text-gray-500">The base URL of your Pterodactyl Panel</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Application API Key
                          </label>
                          <input
                            type="password"
                            value={pterodactylSettings.applicationApiKey}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, applicationApiKey: e.target.value })}
                            placeholder="ptlc_..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                          <p className="mt-1 text-sm text-gray-500">Application API key from Pterodactyl</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Client API Key
                          </label>
                          <input
                            type="password"
                            value={pterodactylSettings.clientApiKey}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, clientApiKey: e.target.value })}
                            placeholder="ptlc_..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <p className="mt-1 text-sm text-gray-500">Client API key (optional, for server status)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key (Legacy)
                          </label>
                          <input
                            type="password"
                            value={pterodactylSettings.apiKey}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, apiKey: e.target.value })}
                            placeholder="ptlc_..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <p className="mt-1 text-sm text-gray-500">Legacy API key (optional)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Node ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.nodeId}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, nodeId: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Nest ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.nestId}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, nestId: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minecraft Egg ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.eggIdMinecraft}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, eggIdMinecraft: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            FiveM Egg ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.eggIdFivem}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, eggIdFivem: parseInt(e.target.value) || 2 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Other Game Egg ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.eggIdOther}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, eggIdOther: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default User ID
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={pterodactylSettings.defaultUserId}
                            onChange={(e) => setPterodactylSettings({ ...pterodactylSettings, defaultUserId: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                          <p className="mt-1 text-sm text-gray-500">Pterodactyl user ID for server ownership</p>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => refetchPterodactyl()}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          type="submit"
                          disabled={settingsLoading}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {settingsLoading ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit User</h2>
              <button onClick={() => setEditUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coins</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.coins}
                  onChange={(e) => setEditFormData({ ...editFormData, coins: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditUserModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coin Adjustment Modal */}
      {coinAdjustmentModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Adjust Coins for {selectedUser.username}</h2>
              <button onClick={() => setCoinAdjustmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitCoinAdjustment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Positive to add, negative to subtract"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current balance: {parseFloat(selectedUser.coins).toFixed(2)} coins
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={coinDescription}
                  onChange={(e) => setCoinDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Reason for adjustment..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Adjust Coins
                </button>
                <button
                  type="button"
                  onClick={() => setCoinAdjustmentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

