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
  InformationCircleIcon,
  SparklesIcon,
  PlusIcon
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
  const { theme, previewTheme, updateTheme, loadBranding } = useTheme();
  const [brandingSettings, setBrandingSettings] = useState({
    dashboardName: 'Aether Dashboard',
    dashboardShortName: 'Aether',
    sidebarLogoUrl: '',
    mainLogoUrl: '',
  });
  const [brandingLoading, setBrandingLoading] = useState(false);
  const sidebarLogoInputRef = React.useRef(null);
  const mainLogoInputRef = React.useRef(null);
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
  const fileInputRef = React.useRef(null);

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
        queryClient.invalidateQueries('balance'); // Invalidate balance query to refresh navbar coin display
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

  // Fetch branding settings
  const { data: brandingData, isLoading: brandingDataLoading, refetch: refetchBranding } = useQuery(
    'brandingSettings',
    async () => {
      const res = await api.get('/admin/settings/branding');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setBrandingSettings(data);
      },
    }
  );

  // Update branding mutation
  const updateBrandingMutation = useMutation(
    async (brandingConfig) => {
      const res = await api.put('/admin/settings/branding', brandingConfig);
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Branding settings updated successfully');
        setBrandingSettings(data.config);
        queryClient.invalidateQueries('brandingSettings');
        // Refresh branding context to apply changes without page reload
        if (loadBranding) {
          loadBranding();
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update branding settings');
      },
    }
  );

  const handleSaveBranding = (e) => {
    e.preventDefault();
    setBrandingLoading(true);
    updateBrandingMutation.mutate(brandingSettings, {
      onSettled: () => {
        setBrandingLoading(false);
      },
    });
  };

  // Handle sidebar logo upload
  const handleSidebarLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, WEBP, or SVG)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setBrandingSettings({
        ...brandingSettings,
        sidebarLogoUrl: dataUrl
      });
      toast.success('Sidebar logo uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle main logo upload
  const handleMainLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, WEBP, or SVG)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setBrandingSettings({
        ...brandingSettings,
        mainLogoUrl: dataUrl
      });
      toast.success('Main logo uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Helper functions for gradient and color parsing
  const parseGradientColors = (gradientString) => {
    if (!gradientString || typeof gradientString !== 'string') {
      return { color1: '#3b82f6', color2: '#06b6d4', direction: 'to right' };
    }
    
    // Match linear-gradient pattern: linear-gradient(to direction, #color1, #color2)
    const gradientMatch = gradientString.match(/linear-gradient\(to\s+(\w+),\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)),\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\))\)/i);
    
    if (gradientMatch) {
      const direction = gradientMatch[1] || 'right';
      let color1 = gradientMatch[2];
      let color2 = gradientMatch[3];
      
      // Convert rgb/rgba to hex if needed
      if (color1.startsWith('rgb')) {
        color1 = extractHexFromRgba(color1);
      }
      if (color2.startsWith('rgb')) {
        color2 = extractHexFromRgba(color2);
      }
      
      // Normalize hex colors (expand 3-digit to 6-digit)
      if (color1 && color1.startsWith('#') && color1.length === 4) {
        color1 = '#' + color1[1] + color1[1] + color1[2] + color1[2] + color1[3] + color1[3];
      }
      if (color2 && color2.startsWith('#') && color2.length === 4) {
        color2 = '#' + color2[1] + color2[1] + color2[2] + color2[2] + color2[3] + color2[3];
      }
      
      return { color1: color1 || '#3b82f6', color2: color2 || '#06b6d4', direction };
    }
    
    return { color1: '#3b82f6', color2: '#06b6d4', direction: 'to right' };
  };

  const buildGradient = (color1, color2, direction = 'right') => {
    // Normalize direction
    const dir = direction.startsWith('to ') ? direction : `to ${direction}`;
    return `linear-gradient(${dir}, ${color1}, ${color2})`;
  };

  const extractHexFromRgba = (rgbaString) => {
    if (!rgbaString || typeof rgbaString !== 'string') {
      return '#ffffff';
    }
    
    // Match rgba or rgb pattern
    const rgbaMatch = rgbaString.match(/(?:rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\))/i);
    
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      return rgbaToHex(r, g, b);
    }
    
    // If it's already a hex color, return it
    if (rgbaString.startsWith('#')) {
      return rgbaString.length === 4 
        ? '#' + rgbaString[1] + rgbaString[1] + rgbaString[2] + rgbaString[2] + rgbaString[3] + rgbaString[3]
        : rgbaString;
    }
    
    return '#ffffff';
  };

  const rgbaToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = Math.max(0, Math.min(255, n)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };

  // Handle file upload for background image
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setThemeSettings({
        ...themeSettings,
        background: { ...themeSettings.background, image: dataUrl }
      });
      toast.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
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
    { id: 'store', name: 'Store Management', icon: CurrencyDollarIcon },
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Pterodactyl Panel URL
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Pterodactyl Panel URL" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              Enter the full URL of your Pterodactyl Panel (e.g., https://panel.yourdomain.com). This is where your Pterodactyl installation is hosted.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Application API Key
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Application API Key" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              Get this from your Pterodactyl Panel: Settings → API Credentials → Application API. This key is required for server creation and management.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Client API Key
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Client API Key" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              Optional. Get this from your Pterodactyl Panel: Settings → API Credentials → Client API. Used for checking server status and resource usage.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        API Key (Legacy)
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Legacy API Key" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              Optional. Legacy API key format. Only needed if you're using an older Pterodactyl version.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Default Node ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Default Node ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The ID of the Pterodactyl node where servers will be created. Find this in your Pterodactyl Panel under Locations → Nodes.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Default Nest ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Default Nest ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The ID of the Pterodactyl nest (game type collection). Find this in your Pterodactyl Panel under Nests.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Minecraft Egg ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Minecraft Egg ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The specific egg ID for Minecraft servers. Find this in your Pterodactyl Panel under Nests → Minecraft → Eggs.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        FiveM Egg ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about FiveM Egg ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The specific egg ID for FiveM servers. Find this in your Pterodactyl Panel under Nests → FiveM → Eggs.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Other Game Egg ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Other Game Egg ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The egg ID for other game types. Find this in your Pterodactyl Panel under Nests → [Game Type] → Eggs.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Default User ID
                        <div className="group relative inline-flex">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-label="Information about Default User ID" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                              The Pterodactyl user ID that will own created servers. This is usually 1 for the first admin user, or find it in Users section of your Pterodactyl Panel.
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                          <div className="flex gap-2">
                            {(() => {
                              const gradient = parseGradientColors(themeSettings.colors?.sidebarBg || 'linear-gradient(to bottom, #1f2937, #111827)');
                              return (
                                <>
                                  <input
                                    type="color"
                                    value={gradient.color1}
                                    onChange={(e) => {
                                      const newGradient = buildGradient(e.target.value, gradient.color2, gradient.direction);
                                      setThemeSettings({
                                        ...themeSettings,
                                        colors: { ...themeSettings.colors, sidebarBg: newGradient }
                                      });
                                    }}
                                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                    title="First color"
                                  />
                                  <input
                                    type="text"
                                    value={themeSettings.colors?.sidebarBg || ''}
                                    onChange={(e) => setThemeSettings({
                                      ...themeSettings,
                                      colors: { ...themeSettings.colors, sidebarBg: e.target.value }
                                    })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="linear-gradient(to bottom, #1f2937, #111827)"
                                  />
                                  <input
                                    type="color"
                                    value={gradient.color2}
                                    onChange={(e) => {
                                      const newGradient = buildGradient(gradient.color1, e.target.value, gradient.direction);
                                      setThemeSettings({
                                        ...themeSettings,
                                        colors: { ...themeSettings.colors, sidebarBg: newGradient }
                                      });
                                    }}
                                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                    title="Second color"
                                  />
                                </>
                              );
                            })()}
                          </div>
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
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={extractHexFromRgba(themeSettings.colors?.cardBg || 'rgba(255, 255, 255, 0.8)')}
                              onChange={(e) => {
                                // Preserve alpha if it exists, otherwise use 0.8
                                const currentValue = themeSettings.colors?.cardBg || 'rgba(255, 255, 255, 0.8)';
                                const alphaMatch = currentValue.match(/[\d.]+(?=\))/);
                                const alpha = alphaMatch ? alphaMatch[0] : '0.8';
                                const hex = e.target.value;
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                setThemeSettings({
                                  ...themeSettings,
                                  colors: { ...themeSettings.colors, cardBg: `rgba(${r}, ${g}, ${b}, ${alpha})` }
                                });
                              }}
                              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={themeSettings.colors?.cardBg || ''}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                colors: { ...themeSettings.colors, cardBg: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="rgba(255, 255, 255, 0.8)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Main Background</label>
                          <div className="flex gap-2">
                            {(() => {
                              const gradient = parseGradientColors(themeSettings.colors?.background || 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)');
                              return (
                                <>
                                  <input
                                    type="color"
                                    value={gradient.color1}
                                    onChange={(e) => {
                                      const newGradient = buildGradient(e.target.value, gradient.color2, gradient.direction);
                                      setThemeSettings({
                                        ...themeSettings,
                                        colors: { ...themeSettings.colors, background: newGradient }
                                      });
                                    }}
                                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                    title="First color"
                                  />
                                  <input
                                    type="text"
                                    value={themeSettings.colors?.background || ''}
                                    onChange={(e) => setThemeSettings({
                                      ...themeSettings,
                                      colors: { ...themeSettings.colors, background: e.target.value }
                                    })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="linear-gradient(...)"
                                  />
                                  <input
                                    type="color"
                                    value={gradient.color2}
                                    onChange={(e) => {
                                      const newGradient = buildGradient(gradient.color1, e.target.value, gradient.direction);
                                      setThemeSettings({
                                        ...themeSettings,
                                        colors: { ...themeSettings.colors, background: newGradient }
                                      });
                                    }}
                                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                    title="Second color"
                                  />
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Colors */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Navigation Item Colors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['dashboard', 'servers', 'earnCoins', 'store', 'admin'].map((navItem) => {
                          const defaultGradients = {
                            dashboard: 'linear-gradient(to right, #3b82f6, #06b6d4)',
                            servers: 'linear-gradient(to right, #a855f7, #ec4899)',
                            earnCoins: 'linear-gradient(to right, #10b981, #14b8a6)',
                            store: 'linear-gradient(to right, #f59e0b, #f97316)',
                            admin: 'linear-gradient(to right, #ef4444, #f43f5e)'
                          };
                          const gradient = parseGradientColors(themeSettings.navigation?.[navItem] || defaultGradients[navItem] || 'linear-gradient(to right, #3b82f6, #06b6d4)');
                          return (
                            <div key={navItem}>
                              <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                                {navItem === 'earnCoins' ? 'Earn Coins' : navItem}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={gradient.color1}
                                  onChange={(e) => {
                                    const newGradient = buildGradient(e.target.value, gradient.color2, gradient.direction);
                                    setThemeSettings({
                                      ...themeSettings,
                                      navigation: { ...themeSettings.navigation, [navItem]: newGradient }
                                    });
                                  }}
                                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                  title="First color"
                                />
                                <input
                                  type="text"
                                  value={themeSettings.navigation?.[navItem] || ''}
                                  onChange={(e) => setThemeSettings({
                                    ...themeSettings,
                                    navigation: { ...themeSettings.navigation, [navItem]: e.target.value }
                                  })}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  placeholder="linear-gradient(to right, #3b82f6, #06b6d4)"
                                />
                                <input
                                  type="color"
                                  value={gradient.color2}
                                  onChange={(e) => {
                                    const newGradient = buildGradient(gradient.color1, e.target.value, gradient.direction);
                                    setThemeSettings({
                                      ...themeSettings,
                                      navigation: { ...themeSettings.navigation, [navItem]: newGradient }
                                    });
                                  }}
                                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                  title="Second color"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Background Image */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Background Image</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={themeSettings.background?.image || ''}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                background: { ...themeSettings.background, image: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="https://example.com/image.jpg"
                            />
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                            >
                              Browse
                            </button>
                          </div>
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
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={extractHexFromRgba(themeSettings.background?.overlay || 'rgba(0, 0, 0, 0)')}
                              onChange={(e) => {
                                // Preserve alpha if it exists, otherwise use 0
                                const currentValue = themeSettings.background?.overlay || 'rgba(0, 0, 0, 0)';
                                const alphaMatch = currentValue.match(/[\d.]+(?=\))/);
                                const alpha = alphaMatch ? alphaMatch[0] : '0';
                                const hex = e.target.value;
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                setThemeSettings({
                                  ...themeSettings,
                                  background: { ...themeSettings.background, overlay: `rgba(${r}, ${g}, ${b}, ${alpha})` }
                                });
                              }}
                              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={themeSettings.background?.overlay || 'rgba(0, 0, 0, 0)'}
                              onChange={(e) => setThemeSettings({
                                ...themeSettings,
                                background: { ...themeSettings.background, overlay: e.target.value }
                              })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="rgba(0, 0, 0, 0.5)"
                            />
                          </div>
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

              {/* Branding */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Branding</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Customize your dashboard name and logos to match your company or startup branding.
                </p>

                {brandingDataLoading ? (
                  <div className="flex justify-center py-12">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveBranding} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    {/* Dashboard Names */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Names</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Name (Full)</label>
                          <input
                            type="text"
                            value={brandingSettings.dashboardName}
                            onChange={(e) => setBrandingSettings({
                              ...brandingSettings,
                              dashboardName: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Aether Dashboard"
                            maxLength={100}
                          />
                          <p className="mt-1 text-sm text-gray-500">Displayed in the navbar and main areas</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Short Name</label>
                          <input
                            type="text"
                            value={brandingSettings.dashboardShortName}
                            onChange={(e) => setBrandingSettings({
                              ...brandingSettings,
                              dashboardShortName: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Aether"
                            maxLength={50}
                          />
                          <p className="mt-1 text-sm text-gray-500">Displayed in the sidebar (optional)</p>
                        </div>
                      </div>
                    </div>

                    {/* Logos */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Logos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sidebar Logo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sidebar Logo</label>
                          <div className="space-y-3">
                            {brandingSettings.sidebarLogoUrl ? (
                              <div className="flex items-center space-x-3">
                                <img
                                  src={brandingSettings.sidebarLogoUrl}
                                  alt="Sidebar Logo"
                                  className="w-16 h-16 object-contain rounded-lg border border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => setBrandingSettings({
                                    ...brandingSettings,
                                    sidebarLogoUrl: ''
                                  })}
                                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                <SparklesIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="file"
                                ref={sidebarLogoInputRef}
                                onChange={handleSidebarLogoUpload}
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => sidebarLogoInputRef.current?.click()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                              >
                                {brandingSettings.sidebarLogoUrl ? 'Change Logo' : 'Upload Logo'}
                              </button>
                            </div>
                            <p className="text-sm text-gray-500">Recommended size: 40x40px. Max 2MB. Formats: JPG, PNG, GIF, WEBP, SVG</p>
                          </div>
                        </div>

                        {/* Main Logo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Main Logo (Optional)</label>
                          <div className="space-y-3">
                            {brandingSettings.mainLogoUrl ? (
                              <div className="flex items-center space-x-3">
                                <img
                                  src={brandingSettings.mainLogoUrl}
                                  alt="Main Logo"
                                  className="h-12 object-contain rounded-lg border border-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => setBrandingSettings({
                                    ...brandingSettings,
                                    mainLogoUrl: ''
                                  })}
                                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                <span className="text-sm text-gray-400">No logo (text will be used)</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="file"
                                ref={mainLogoInputRef}
                                onChange={handleMainLogoUpload}
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => mainLogoInputRef.current?.click()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                              >
                                {brandingSettings.mainLogoUrl ? 'Change Logo' : 'Upload Logo'}
                              </button>
                            </div>
                            <p className="text-sm text-gray-500">Recommended size: 120x40px. Max 2MB. Formats: JPG, PNG, GIF, WEBP, SVG</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (brandingData) {
                            setBrandingSettings(brandingData);
                          } else {
                            refetchBranding();
                          }
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={brandingLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {brandingLoading ? 'Saving...' : 'Save Branding'}
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

          {/* Store Management Tab */}
          {activeTab === 'store' && (
            <StoreManagementSection />
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

// Store Management Section Component
const StoreManagementSection = () => {
  const queryClient = useQueryClient();
  
  // Resource Pricing State
  const [pricing, setPricing] = useState({
    cpu: { per_core: 100, per_hour: 5 },
    memory: { per_gb: 200, per_hour: 10 },
    disk: { per_gb: 50, per_hour: 2 },
  });

  // Templates State
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    cpu_cores: 2,
    ram_gb: 2,
    disk_gb: 10,
    price: 500,
    game_type: 'minecraft',
    enabled: true,
    icon: 'ServerIcon',
    gradient_colors: { color1: '#3b82f6', color2: '#06b6d4' },
    display_order: 0,
  });

  // Fetch resource pricing
  const { data: pricingData, isLoading: pricingDataLoading } = useQuery(
    'storePricing',
    async () => {
      const res = await api.get('/admin/store/pricing');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setPricing(data);
      },
    }
  );

  // Fetch templates
  const { data: templatesData, isLoading: templatesDataLoading } = useQuery(
    'storeTemplates',
    async () => {
      const res = await api.get('/admin/store/templates');
      return res.data;
    }
  );

  // Update pricing mutation
  const updatePricingMutation = useMutation(
    async (newPricing) => {
      const res = await api.put('/admin/store/pricing', newPricing);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Resource pricing updated successfully');
        queryClient.invalidateQueries('storePricing');
        queryClient.invalidateQueries('pricing');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update pricing');
      },
    }
  );

  // Template mutations
  const createTemplateMutation = useMutation(
    async (templateData) => {
      const res = await api.post('/admin/store/templates', templateData);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Template created successfully');
        queryClient.invalidateQueries('storeTemplates');
        queryClient.invalidateQueries('templates');
        setTemplateFormOpen(false);
        resetTemplateForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create template');
      },
    }
  );

  const updateTemplateMutation = useMutation(
    async ({ id, data }) => {
      const res = await api.put(`/admin/store/templates/${id}`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Template updated successfully');
        queryClient.invalidateQueries('storeTemplates');
        queryClient.invalidateQueries('templates');
        setTemplateFormOpen(false);
        setEditingTemplate(null);
        resetTemplateForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update template');
      },
    }
  );

  const deleteTemplateMutation = useMutation(
    async (id) => {
      const res = await api.delete(`/admin/store/templates/${id}`);
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Template deleted successfully');
        queryClient.invalidateQueries('storeTemplates');
        queryClient.invalidateQueries('templates');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete template');
      },
    }
  );

  const toggleTemplateEnabledMutation = useMutation(
    async ({ id, enabled }) => {
      const res = await api.put(`/admin/store/templates/${id}`, { enabled });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('storeTemplates');
        queryClient.invalidateQueries('templates');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update template');
      },
    }
  );

  const reorderTemplatesMutation = useMutation(
    async (reorderData) => {
      const res = await api.put('/admin/store/templates/reorder', { templates: reorderData });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('storeTemplates');
        queryClient.invalidateQueries('templates');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to reorder templates');
      },
    }
  );

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      cpu_cores: 2,
      ram_gb: 2,
      disk_gb: 10,
      price: 500,
      game_type: 'minecraft',
      enabled: true,
      icon: 'ServerIcon',
      gradient_colors: { color1: '#3b82f6', color2: '#06b6d4' },
      display_order: 0,
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      cpu_cores: template.cpu_cores,
      ram_gb: template.ram_gb,
      disk_gb: template.disk_gb,
      price: template.price,
      game_type: template.game_type,
      enabled: template.enabled,
      icon: template.icon,
      gradient_colors: template.gradient_colors,
      display_order: template.display_order,
    });
    setTemplateFormOpen(true);
  };

  const handleDeleteTemplate = (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleMoveTemplate = (index, direction) => {
    if (!templatesData) return;
    const newTemplates = [...templatesData];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newTemplates.length) return;
    
    [newTemplates[index], newTemplates[newIndex]] = [newTemplates[newIndex], newTemplates[index]];
    
    const reorderData = newTemplates.map((t, i) => ({
      id: t.id,
      display_order: i,
    }));
    
    reorderTemplatesMutation.mutate(reorderData);
  };

  const handleSavePricing = () => {
    updatePricingMutation.mutate(pricing);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  // Allowed icons list (from iconValidator)
  const allowedIcons = [
    'ServerIcon', 'CpuChipIcon', 'CircleStackIcon', 'CubeIcon', 'SparklesIcon',
    'CurrencyDollarIcon', 'ChartBarIcon', 'Cog6ToothIcon', 'ShieldCheckIcon',
  ];

  return (
    <div className="space-y-6">
      {/* Resource Pricing Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Resource Pricing</h2>
        
        {pricingDataLoading ? (
          <div className="flex justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* CPU Pricing */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3">CPU Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per Core (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={pricing.cpu.per_core}
                    onChange={(e) => setPricing({ ...pricing, cpu: { ...pricing.cpu, per_core: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per Hour (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={pricing.cpu.per_hour}
                    onChange={(e) => setPricing({ ...pricing, cpu: { ...pricing.cpu, per_hour: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Memory Pricing */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3">Memory (RAM) Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per GB (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={pricing.memory.per_gb}
                    onChange={(e) => setPricing({ ...pricing, memory: { ...pricing.memory, per_gb: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per Hour (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={pricing.memory.per_hour}
                    onChange={(e) => setPricing({ ...pricing, memory: { ...pricing.memory, per_hour: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Disk Pricing */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3">Disk Space Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per GB (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={pricing.disk.per_gb}
                    onChange={(e) => setPricing({ ...pricing, disk: { ...pricing.disk, per_gb: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Per Hour (coins)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={pricing.disk.per_hour}
                    onChange={(e) => setPricing({ ...pricing, disk: { ...pricing.disk, per_hour: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePricing}
              disabled={updatePricingMutation.isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updatePricingMutation.isLoading ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        )}
      </div>

      {/* Server Templates Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Server Templates</h2>
          <button
            onClick={() => {
              resetTemplateForm();
              setEditingTemplate(null);
              setTemplateFormOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 inline mr-1" />
            Add Template
          </button>
        </div>

        {templatesDataLoading ? (
          <div className="flex justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : !templatesData || templatesData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No templates found. Create your first template!</div>
        ) : (
          <div className="space-y-3">
            {templatesData.map((template, index) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleMoveTemplate(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveTemplate(index, 'down')}
                        disabled={index === templatesData.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">
                        {template.cpu_cores} CPU • {template.ram_gb}GB RAM • {template.disk_gb}GB Disk • {template.price} coins • {template.game_type}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={(e) => toggleTemplateEnabledMutation.mutate({ id: template.id, enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Enabled</span>
                  </label>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Form Modal */}
      {templateFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <button onClick={() => { setTemplateFormOpen(false); setEditingTemplate(null); resetTemplateForm(); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Game Type *</label>
                  <select
                    value={templateFormData.game_type}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, game_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="minecraft">Minecraft</option>
                    <option value="fivem">FiveM</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  maxLength={500}
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPU Cores *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={templateFormData.cpu_cores}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, cpu_cores: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB) *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={templateFormData.ram_gb}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, ram_gb: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disk (GB) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={templateFormData.disk_gb}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, disk_gb: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (coins) *</label>
                  <input
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    value={templateFormData.price}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, price: parseFloat(e.target.value) || 0.01 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon *</label>
                  <select
                    value={templateFormData.icon}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {allowedIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gradient Color 1 *</label>
                  <input
                    type="color"
                    value={templateFormData.gradient_colors.color1}
                    onChange={(e) => setTemplateFormData({
                      ...templateFormData,
                      gradient_colors: { ...templateFormData.gradient_colors, color1: e.target.value }
                    })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gradient Color 2 *</label>
                  <input
                    type="color"
                    value={templateFormData.gradient_colors.color2}
                    onChange={(e) => setTemplateFormData({
                      ...templateFormData,
                      gradient_colors: { ...templateFormData.gradient_colors, color2: e.target.value }
                    })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={templateFormData.enabled}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Enabled</label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setTemplateFormOpen(false); setEditingTemplate(null); resetTemplateForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={createTemplateMutation.isLoading || updateTemplateMutation.isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createTemplateMutation.isLoading || updateTemplateMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

