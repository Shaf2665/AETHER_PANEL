import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/api';
import { 
  CpuChipIcon, 
  CircleStackIcon, 
  ServerIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  SparklesIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Icon mapping helper
const iconMap = {
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  CubeIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
};

const Store = () => {
  const { data: pricing } = useQuery('pricing', async () => {
    const res = await api.get('/resources/pricing');
    return res.data;
  });

  const { data: balance } = useQuery('balance', async () => {
    const res = await api.get('/coins/balance');
    return res.data;
  });

  // Fetch templates from API
  const { data: templates, isLoading: templatesLoading } = useQuery('templates', async () => {
    const res = await api.get('/resources/templates');
    return res.data;
  });

  const resources = [
    {
      name: 'CPU',
      icon: CpuChipIcon,
      description: 'Processing power for your server',
      pricing: pricing?.cpu,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      name: 'Memory (RAM)',
      icon: CircleStackIcon,
      description: 'Memory allocation for your server',
      pricing: pricing?.memory,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      name: 'Disk Space',
      icon: ServerIcon,
      description: 'Storage space for your server',
      pricing: pricing?.disk,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
          Resource Store
        </h1>
        <p className="text-gray-600">Purchase resources to power your game servers</p>
      </div>

      <div className="mb-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Available Coins</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                {balance?.coins || 0}
              </p>
            </div>
          </div>
          <Link
            to="/earn"
            className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            Earn More Coins
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {resources.map((resource, index) => (
          <div 
            key={resource.name} 
            className={`bg-gradient-to-br ${resource.bgGradient} rounded-2xl shadow-xl p-6 border border-white/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`bg-gradient-to-br ${resource.gradient} p-4 rounded-xl w-fit mb-4 shadow-lg`}>
              <resource.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{resource.name}</h3>
            <p className="text-gray-600 mb-6">{resource.description}</p>
            
            {resource.pricing && (
              <div className="space-y-3 mb-6">
                <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-white/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">One-time:</span>
                    <span className={`font-bold text-lg bg-gradient-to-r ${resource.gradient} bg-clip-text text-transparent`}>
                      {resource.name === 'CPU' && `${resource.pricing.per_core} coins/core`}
                      {resource.name === 'Memory (RAM)' && `${resource.pricing.per_gb} coins/GB`}
                      {resource.name === 'Disk Space' && `${resource.pricing.per_gb} coins/GB`}
                    </span>
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-white/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Hourly:</span>
                    <span className={`font-bold text-lg bg-gradient-to-r ${resource.gradient} bg-clip-text text-transparent`}>
                      {resource.pricing.per_hour} coins/hour
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <button className={`w-full px-4 py-3 bg-gradient-to-r ${resource.gradient} text-white rounded-xl hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-semibold`}>
              Purchase {resource.name}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ServerIcon className="h-6 w-6 mr-2 text-purple-500" />
          Server Templates
        </h2>
        {templatesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => {
              const IconComponent = iconMap[template.icon] || ServerIcon;
              const gradientColors = template.gradient_colors || { color1: '#3b82f6', color2: '#06b6d4' };
              const gradientStyle = `linear-gradient(to right, ${gradientColors.color1}, ${gradientColors.color2})`;
              const bgGradientStyle = `linear-gradient(to bottom right, ${gradientColors.color1}20, ${gradientColors.color2}20)`;
              
              return (
                <div
                  key={template.id}
                  className="border-2 rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{ 
                    background: bgGradientStyle,
                    borderColor: gradientColors.color1 + '40'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mr-3"
                      style={{ background: gradientStyle }}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                  </div>
                  {template.description && (
                    <p className="text-gray-600 mb-2">{template.description}</p>
                  )}
                  <p className="text-gray-600 mb-4">
                    {template.cpu_cores} CPU core{template.cpu_cores !== 1 ? 's' : ''}, {template.ram_gb}GB RAM, {template.disk_gb}GB Disk
                  </p>
                  <div className="mb-4">
                    <p 
                      className="text-3xl font-bold bg-clip-text text-transparent"
                      style={{ backgroundImage: gradientStyle }}
                    >
                      {template.price} coins
                    </p>
                  </div>
                  <button 
                    className="w-full px-4 py-3 text-white rounded-xl hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-semibold"
                    style={{ background: gradientStyle }}
                    onClick={() => {
                      // TODO: Implement template deployment
                      console.log('Deploy template:', template);
                    }}
                  >
                    Deploy Now
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No server templates available at the moment.
          </div>
        )}
      </div>
    </div>
  );
};

export default Store;

