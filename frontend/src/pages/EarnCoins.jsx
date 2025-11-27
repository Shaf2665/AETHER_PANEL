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
        window.open(data.linkvertiseUrl, '_blank');
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
      action: () => linkvertiseMutation.mutate(),
      color: 'bg-blue-500',
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Earn Coins</h1>
        <div className="flex items-center text-lg">
          <CurrencyDollarIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <span className="font-semibold text-gray-900">
            Current Balance: {balance?.coins || 0} coins
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {earnMethods.map((method) => (
          <div key={method.name} className="bg-white rounded-lg shadow p-6">
            <div className={`${method.color} p-3 rounded-lg w-fit mb-4`}>
              <method.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{method.name}</h3>
            <p className="text-gray-600 mb-4">{method.description}</p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Reward:</span>
              <span className="font-semibold text-green-600">{method.coins} coins</span>
            </div>
            {method.active && (
              <div className="mb-4 p-2 bg-green-50 rounded text-sm text-green-700">
                Active session: {afkStatus?.minutes || 0} minutes
              </div>
            )}
            <button
              onClick={method.action}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                method.active
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {method.active ? 'Complete Session' : `Start ${method.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">More Ways to Earn</h2>
        <div className="space-y-2 text-gray-600">
          <p>• Complete surveys (100-500 coins)</p>
          <p>• Watch advertisements (10 coins per view)</p>
          <p>• Refer friends (500 coins per referral)</p>
          <p>• Daily login bonus (25 coins)</p>
        </div>
      </div>
    </div>
  );
};

export default EarnCoins;

