import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
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
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Admin = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stats');
  
  // Check if we're on the settings route
  const isSettingsRoute = location.pathname === '/admin/settings';
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
  const [linkvertiseSettings, setLinkvertiseSettings] = useState({
    enabled: false,
    apiKey: '',
    coinsPerCompletion: 50,
    cooldownMinutes: 30,
    manualMode: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [linkvertiseLoading, setLinkvertiseLoading] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const { theme, previewTheme, updateTheme } = useTheme();
  const [themeSettings, setThemeSettings] = useState({
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      sidebarBg: 'linear-gradient(to bottom, #1f2937, #111827)',
      sidebarText: '#ffffff',
      sidebarHover: 'rgba(255, 255, 255, 0.1)',
      navActive: 'linear-gradient(to right, #3b82f6, #06b6d4)',
      background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
      cardBg: 'rgba(255, 255, 255, 0.8)',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
    },
    navigation: {
      dashboard: 'linear-gradient(to right, #3b82f6, #06b6d4)',
      servers: 'linear-gradient(to right, #a855f7, #ec4899)',
      earnCoins: 'linear-gradient(to right, #10b981, #14b8a6)',
      store: 'linear-gradient(to right, #f59e0b, #f97316)',
      admin: 'linear-gradient(to right, #ef4444, #f43f5e)',
    },
    background: {
      image: '',
      overlay: 'rgba(0, 0, 0, 0)',
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
    },
    customCSS: '',
  });
  const [themeLoading, setThemeLoading] = useState(false);

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

  // Fetch Linkvertise settings
  const { data: linkvertiseData, isLoading: linkvertiseDataLoading, refetch: refetchLinkvertise } = useQuery(
    'linkvertiseSettings',
    async () => {
      const res = await api.get('/admin/settings/linkvertise');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setLinkvertiseSettings({
          enabled: data.enabled || false,
          apiKey: data.apiKey || '',
          coinsPerCompletion: data.coinsPerCompletion || 50,
          cooldownMinutes: data.cooldownMinutes || 30,
          manualMode: data.manualMode !== false,
        });
      },
    }
  );

  // Fetch theme settings
  const { data: themeData, isLoading: themeDataLoading, refetch: refetchTheme } = useQuery(
    'themeSettings',
    async () => {
      const res = await api.get('/admin/settings/theme');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setThemeSettings(data);
      },
    }
  );

  // Update theme mutation
  const updateThemeMutation = useMutation(
    async (themeConfig) => {
      const res = await api.put('/admin/settings/theme', themeConfig);
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Theme settings updated successfully');
        setThemeSettings(data.config);
        updateTheme(data.config);
        queryClient.invalidateQueries('themeSettings');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update theme settings');
      },
    }
  );

  const handleSaveTheme = (e) => {
    e.preventDefault();
    setThemeLoading(true);
    updateThemeMutation.mutate(themeSettings, {
      onSettled: () => {
        setThemeLoading(false);
      },
    });
  };

  const handlePreviewTheme = () => {
    previewTheme(themeSettings);
  };

  const handleResetTheme = () => {
    if (theme) {
      setThemeSettings(theme);
      previewTheme(theme);
    } else {
      refetchTheme();
    }
  };

  // Update Linkvertise settings mutation
  const updateLinkvertiseMutation = useMutation(
    async (data) => {
      const res = await api.put('/admin/settings/linkvertise', data);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Linkvertise settings updated successfully');
        refetchLinkvertise();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update Linkvertise settings');
      },
    }
  );

  const handleLinkvertiseSubmit = (e) => {
    e.preventDefault();
    setLinkvertiseLoading(true);
    updateLinkvertiseMutation.mutate(linkvertiseSettings, {
      onSettled: () => {
        setLinkvertiseLoading(false);
      },
    });
  };

  // Fetch update status
  const { data: updateStatus, isLoading: updateStatusLoading, refetch: refetchUpdateStatus } = useQuery(
    'updateStatus',
    async () => {
      const res = await api.get('/admin/system/update/status');
      return res.data;
    },
    {
      refetchInterval: (data) => {
        // Poll every 2 seconds when updating
        return data?.isUpdating ? 2000 : false;
      },
    }
  );

  // Perform update mutation
  const performUpdateMutation = useMutation(
    async () => {
      const res = await api.post('/admin/system/update');
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Update started');
        setUpdateModalOpen(true);
        refetchUpdateStatus();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to start update');
      },
    }
  );

  const handleUpdateClick = () => {
    if (window.confirm('Are you sure you want to update the system? This will pull the latest code from GitHub and rebuild containers.')) {
      performUpdateMutation.mutate();
    }
  };

  const tabs = [
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
    { id: 'users', name: 'Users', icon: UsersIcon },
    { id: 'servers', name: 'Servers', icon: ServerIcon },
    { id: 'transactions', name: 'Transactions', icon: CurrencyDollarIcon },
    { id: 'revenue', name: 'Revenue', icon: ArrowTrendingUpIcon },
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

      {/* Render Settings directly if on settings route, otherwise show tabs */}
      {isSettingsRoute ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {pterodactylLoading || linkvertiseDataLoading || themeDataLoading ? (
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

              {/* Linkvertise Configuration */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Linkvertise Configuration</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Configure Linkvertise integration for revenue generation. Users can complete links to earn coins.
                </p>

                <form onSubmit={handleLinkvertiseSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={linkvertiseSettings.enabled}
                          onChange={(e) => setLinkvertiseSettings({ ...linkvertiseSettings, enabled: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Enable Linkvertise</span>
                      </label>
                      <p className="mt-1 text-sm text-gray-500 ml-8">Allow users to earn coins by completing Linkvertise links</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Linkvertise API Key
                      </label>
                      <input
                        type="password"
                        value={linkvertiseSettings.apiKey}
                        onChange={(e) => setLinkvertiseSettings({ ...linkvertiseSettings, apiKey: e.target.value })}
                        placeholder="Enter your Linkvertise API key (optional)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">API key for automatic verification (leave empty for manual mode)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Coins per Completion
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={linkvertiseSettings.coinsPerCompletion}
                        onChange={(e) => setLinkvertiseSettings({ ...linkvertiseSettings, coinsPerCompletion: parseInt(e.target.value) || 50 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">Number of coins awarded per completed link</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cooldown Minutes
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={linkvertiseSettings.cooldownMinutes}
                        onChange={(e) => setLinkvertiseSettings({ ...linkvertiseSettings, cooldownMinutes: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">Minutes users must wait between completions</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={linkvertiseSettings.manualMode}
                          onChange={(e) => setLinkvertiseSettings({ ...linkvertiseSettings, manualMode: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Manual Verification Mode</span>
                      </label>
                      <p className="mt-1 text-sm text-gray-500 ml-8">
                        When enabled, users manually mark links as complete. Disable for automatic API verification.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => refetchLinkvertise()}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={linkvertiseLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkvertiseLoading ? 'Saving...' : 'Save Linkvertise Settings'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Theme Editor */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Theme Editor</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Customize your dashboard appearance including colors, gradients, and background images.
                </p>

                {themeDataLoading ? (
                  <div className="flex justify-center py-12">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveTheme} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    {/* Color Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Colors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={themeSettings.colors?.primary?.replace(/[^#0-9A-Fa-f]/g, '') || '#3b82f6'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, primary: e.target.value }
                              })}
                              className="h-10 w-20 rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              value={themeSettings.colors?.primary || '#3b82f6'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, primary: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="#3b82f6 or linear-gradient(...)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={themeSettings.colors?.secondary?.replace(/[^#0-9A-Fa-f]/g, '') || '#8b5cf6'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, secondary: e.target.value }
                              })}
                              className="h-10 w-20 rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              value={themeSettings.colors?.secondary || '#8b5cf6'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, secondary: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="#8b5cf6 or linear-gradient(...)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sidebar Background</label>
                          <input
                            type="text"
                            value={themeSettings.colors?.sidebarBg || ''}
                            onChange={(e) => setThemeSettings({
                              ...themeSettings,
                              colors: { ...themeSettings.colors, sidebarBg: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="linear-gradient(to bottom, #1f2937, #111827)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sidebar Text</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={themeSettings.colors?.sidebarText?.replace(/[^#0-9A-Fa-f]/g, '') || '#ffffff'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, sidebarText: e.target.value }
                              })}
                              className="h-10 w-20 rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              value={themeSettings.colors?.sidebarText || '#ffffff'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, sidebarText: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Card Background</label>
                          <input
                            type="text"
                            value={themeSettings.colors?.cardBg || ''}
                            onChange={(e) => setThemeSettings({
                              ...themeSettings,
                              colors: { ...themeSettings.colors, cardBg: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="rgba(255, 255, 255, 0.8)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Main Background</label>
                          <input
                            type="text"
                            value={themeSettings.colors?.background || ''}
                            onChange={(e) => setThemeSettings({
                              ...themeSettings,
                              colors: { ...themeSettings.colors, background: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="linear-gradient(...)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Navigation Colors */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Navigation Item Colors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['dashboard', 'servers', 'earnCoins', 'store', 'admin'].map((navItem) => (
                          <div key={navItem}>
                            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                              {navItem === 'earnCoins' ? 'Earn Coins' : navItem}
                            </label>
                            <input
                              type="text"
                              value={themeSettings.navigation?.[navItem] || ''}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                navigation: { ...themeSettings.navigation, [navItem]: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="linear-gradient(to right, #3b82f6, #06b6d4)"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Background Image */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Background Image</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                          <input
                            type="url"
                            value={themeSettings.background?.image || ''}
                            onChange={(e) => setThemeSettings({
                              ...themeSettings,
                              background: { ...themeSettings.background, image: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                            <select
                              value={themeSettings.background?.position || 'center'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                background: { ...themeSettings.background, position: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="center">Center</option>
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                            <select
                              value={themeSettings.background?.size || 'cover'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                background: { ...themeSettings.background, size: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overlay Color</label>
                          <input
                            type="text"
                            value={themeSettings.background?.overlay || 'rgba(0, 0, 0, 0)'}
                            onChange={(e) => setThemeSettings({
                              ...themeSettings,
                              background: { ...themeSettings.background, overlay: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="rgba(0, 0, 0, 0.5)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom CSS */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Custom CSS</h3>
                      <textarea
                        value={themeSettings.customCSS || ''}
                        onChange={(e) => setThemeSettings({
                          ...themeSettings,
                          customCSS: e.target.value
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="/* Add your custom CSS here */"
                      />
                      <p className="mt-1 text-sm text-gray-500">Add custom CSS to further customize your dashboard</p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleResetTheme}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handlePreviewTheme}
                        className="px-4 py-2 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        type="submit"
                        disabled={themeLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {themeLoading ? 'Saving...' : 'Save Theme'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* System Update */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">System Update</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Update the dashboard to the latest version from GitHub. This will pull the latest code, rebuild containers, and run migrations.
                </p>

                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                  {!updateStatus?.canUpdate ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">System updates are disabled</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            To enable system updates, set <code className="bg-yellow-100 px-1 rounded">ENABLE_SYSTEM_UPDATE=true</code> in your <code className="bg-yellow-100 px-1 rounded">.env</code> file and restart the container.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Update Dashboard</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {updateStatus?.isUpdating ? 'Update in progress...' : 'Ready to update'}
                          </p>
                        </div>
                        <button
                          onClick={handleUpdateClick}
                          disabled={updateStatus?.isUpdating || performUpdateMutation.isLoading}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <ArrowPathIcon className={`h-5 w-5 ${updateStatus?.isUpdating ? 'animate-spin' : ''}`} />
                          <span>{updateStatus?.isUpdating ? 'Updating...' : 'Update Now'}</span>
                        </button>
                      </div>

                      {updateStatus?.isUpdating && (
                        <div className="mt-4">
                          <button
                            onClick={() => setUpdateModalOpen(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            View update progress →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
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
            </div>
          </div>
        </>
      )}

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

      {/* Update Progress Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">System Update Progress</h2>
              <button
                onClick={() => {
                  if (!updateStatus?.isUpdating) {
                    setUpdateModalOpen(false);
                  }
                }}
                disabled={updateStatus?.isUpdating}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {updateStatusLoading ? (
                <div className="flex justify-center py-8">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : updateStatus?.logs && updateStatus.logs.length > 0 ? (
                <div className="space-y-2 font-mono text-sm">
                  {updateStatus.logs.map((log, idx) => {
                    const getIcon = () => {
                      switch (log.type) {
                        case 'success':
                          return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
                        case 'error':
                          return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
                        case 'warning':
                          return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
                        default:
                          return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
                      }
                    };

                    const getColor = () => {
                      switch (log.type) {
                        case 'success':
                          return 'text-green-700 bg-green-50';
                        case 'error':
                          return 'text-red-700 bg-red-50';
                        case 'warning':
                          return 'text-yellow-700 bg-yellow-50';
                        default:
                          return 'text-gray-700 bg-gray-50';
                      }
                    };

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${getColor()} flex items-start space-x-2`}
                      >
                        {getIcon()}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span>{log.message}</span>
                            {log.timestamp && (
                              <span className="text-xs opacity-70 ml-2">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No update logs available
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {updateStatus?.isUpdating ? (
                  <span className="flex items-center space-x-2">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-indigo-600" />
                    <span>Update in progress...</span>
                  </span>
                ) : (
                  <span>Update completed</span>
                )}
              </div>
              <button
                onClick={() => {
                  refetchUpdateStatus();
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
            </div>
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

