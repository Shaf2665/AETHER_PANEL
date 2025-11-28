import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  LinkIcon, 
  ClockIcon,
  GiftIcon 
} from '@heroicons/react/24/outline';

const EarnCoins = () => {
  const queryClient = useQueryClient();
  const [afkMinutes, setAfkMinutes] = useState(0);
  const [activeLinkvertiseLink, setActiveLinkvertiseLink] = useState(null);

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  });

  const { data: afkStatus } = useQuery('afkStatus', async () => {
    const res = await api.get('/revenue/afk/status');
    return res.data;
  }, { refetchInterval: 1000 });

  const linkvertiseMutation = useMutation(
    async () => {
      const res = await api.post('/revenue/linkvertise/generate', {
        targetUrl: 'https://example.com',
      });
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Link generated! Complete it to earn coins.');
        setActiveLinkvertiseLink(data);
        window.open(data.linkvertiseUrl, '_blank');
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to generate link';
        toast.error(message);
      },
    }
  );

  const linkvertiseCompleteMutation = useMutation(
    async (linkId) => {
      const res = await api.post('/revenue/linkvertise/complete', {
        linkId: linkId,
      });
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Successfully earned ${data.coins} coins!`);
        queryClient.invalidateQueries('balance');
        setActiveLinkvertiseLink(null);
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to complete link';
        toast.error(message);
      },
    }
  );

  const afkStartMutation = useMutation(
    async () => {
      const res = await api.post('/revenue/afk/start');
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('AFK session started!');
      },
    }
  );

  const afkCompleteMutation = useMutation(
    async () => {
      const res = await api.post('/revenue/afk/complete');
      return res.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Earned ${data.coinsEarned} coins!`);
        queryClient.invalidateQueries('balance');
        setAfkMinutes(0);
      },
    }
  );

  const earnMethods = [
    {
      name: 'Linkvertise',
      description: 'Complete short links to earn coins',
      icon: LinkIcon,
      coins: 50,
      action: () => {
        if (activeLinkvertiseLink) {
          linkvertiseCompleteMutation.mutate(activeLinkvertiseLink.linkId);
        } else {
          linkvertiseMutation.mutate();
        }
      },
      color: 'bg-blue-500',
      hasActiveLink: !!activeLinkvertiseLink,
    },
    {
      name: 'AFK Page',
      description: 'Stay on the page to earn coins over time',
      icon: ClockIcon,
      coins: '1 per minute',
      action: () => {
        if (afkStatus?.active) {
          afkCompleteMutation.mutate();
        } else {
          afkStartMutation.mutate();
        }
      },
      color: 'bg-green-500',
      active: afkStatus?.active,
    },
    {
      name: 'Daily Login',
      description: 'Log in daily to get bonus coins',
      icon: GiftIcon,
      coins: 25,
      action: () => toast.info('Daily login bonus will be awarded automatically'),
      color: 'bg-purple-500',
    },
  ];

  const getGradient = (method) => {
    if (method.name === 'Linkvertise') return 'from-blue-500 to-cyan-600';
    if (method.name === 'AFK Page') return 'from-emerald-500 to-teal-600';
    return 'from-purple-500 to-pink-600';
  };

  const getBgGradient = (method) => {
    if (method.name === 'Linkvertise') return 'from-blue-50 to-cyan-50';
    if (method.name === 'AFK Page') return 'from-emerald-50 to-teal-50';
    return 'from-purple-50 to-pink-50';
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-4">
          Earn Coins
        </h1>
        <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 rounded-xl shadow-lg w-fit">
          <CurrencyDollarIcon className="h-7 w-7 text-white" />
          <div>
            <p className="text-sm text-white/90">Current Balance</p>
            <p className="text-2xl font-bold text-white">
              {balance?.coins || 0} coins
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {earnMethods.map((method, index) => (
          <div 
            key={method.name} 
            className={`bg-gradient-to-br ${getBgGradient(method)} rounded-2xl shadow-xl p-6 border border-white/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`bg-gradient-to-br ${getGradient(method)} p-4 rounded-xl w-fit mb-4 shadow-lg`}>
              <method.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{method.name}</h3>
            <p className="text-gray-600 mb-4">{method.description}</p>
            
            <div className="mb-4 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Reward:</span>
                <span className={`text-lg font-bold bg-gradient-to-r ${getGradient(method)} bg-clip-text text-transparent`}>
                  {method.coins} {typeof method.coins === 'number' ? 'coins' : ''}
                </span>
              </div>
            </div>

            {method.active && (
              <div className="mb-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Active Session</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-700">Running</span>
                  </div>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2 mb-1">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((afkStatus?.minutes || 0) / 60 * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-green-700 font-medium">
                  {afkStatus?.minutes || 0} / 60 minutes
                </p>
              </div>
            )}

            {method.hasActiveLink && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  ✓ Link generated! Complete it, then claim your coins below.
                </p>
              </div>
            )}

            <button
              onClick={method.action}
              disabled={method.hasActiveLink && linkvertiseCompleteMutation.isLoading}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-white shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gradient-to-r ${getGradient(method)} hover:shadow-xl`}
            >
              {method.hasActiveLink
                ? linkvertiseCompleteMutation.isLoading
                  ? 'Processing...'
                  : '✓ Mark as Complete'
                : method.active
                ? 'Complete Session'
                : `Start ${method.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <GiftIcon className="h-6 w-6 mr-2 text-purple-500" />
          More Ways to Earn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { text: 'Complete surveys', coins: '100-500 coins', color: 'from-blue-500 to-indigo-600' },
            { text: 'Watch advertisements', coins: '10 coins per view', color: 'from-green-500 to-emerald-600' },
            { text: 'Refer friends', coins: '500 coins per referral', color: 'from-purple-500 to-pink-600' },
            { text: 'Daily login bonus', coins: '25 coins', color: 'from-amber-500 to-orange-600' },
          ].map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              <span className="text-gray-700 font-medium">{item.text}</span>
              <span className={`px-3 py-1 rounded-lg bg-gradient-to-r ${item.color} text-white text-sm font-semibold shadow-md`}>
                {item.coins}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EarnCoins;

