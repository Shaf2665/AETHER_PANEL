/**
 * Icon Validator Utility
 * Validates icon names against Heroicons whitelist to prevent XSS attacks
 */

// Whitelist of allowed Heroicons icon names (commonly used icons)
const ALLOWED_ICONS = [
  'ServerIcon',
  'CpuChipIcon',
  'CircleStackIcon',
  'CubeIcon',
  'SparklesIcon',
  'CurrencyDollarIcon',
  'ChartBarIcon',
  'Cog6ToothIcon',
  'ShieldCheckIcon',
  'UserGroupIcon',
  'CreditCardIcon',
  'ArrowRightIcon',
  'ArrowLeftIcon',
  'PlusIcon',
  'MinusIcon',
  'XMarkIcon',
  'PencilIcon',
  'TrashIcon',
  'CheckCircleIcon',
  'ExclamationTriangleIcon',
  'InformationCircleIcon',
  'ClockIcon',
  'CalendarIcon',
  'GlobeAltIcon',
  'HomeIcon',
  'ShoppingBagIcon',
  'ShoppingCartIcon',
  'TagIcon',
  'StarIcon',
  'HeartIcon',
  'BellIcon',
  'EnvelopeIcon',
  'PhoneIcon',
  'CameraIcon',
  'PhotoIcon',
  'DocumentIcon',
  'FolderIcon',
  'CloudIcon',
  'WifiIcon',
  'BatteryIcon',
  'LightBulbIcon',
  'FireIcon',
  'BoltIcon',
  'SunIcon',
  'MoonIcon',
  'PlayIcon',
  'PauseIcon',
  'StopIcon',
  'ForwardIcon',
  'BackwardIcon',
];

/**
 * Validate if an icon name is in the whitelist
 * @param {string} iconName - The icon name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateIcon(iconName) {
  if (!iconName || typeof iconName !== 'string') {
    return false;
  }
  
  // Trim whitespace and check against whitelist
  const trimmed = iconName.trim();
  return ALLOWED_ICONS.includes(trimmed);
}

/**
 * Get list of all allowed icons
 * @returns {string[]} - Array of allowed icon names
 */
function getAllowedIcons() {
  return [...ALLOWED_ICONS];
}

/**
 * Sanitize icon name - returns valid icon or default
 * @param {string} iconName - The icon name to sanitize
 * @param {string} defaultIcon - Default icon if invalid (default: 'ServerIcon')
 * @returns {string} - Valid icon name
 */
function sanitizeIcon(iconName, defaultIcon = 'ServerIcon') {
  if (validateIcon(iconName)) {
    return iconName.trim();
  }
  return validateIcon(defaultIcon) ? defaultIcon : 'ServerIcon';
}

module.exports = {
  validateIcon,
  getAllowedIcons,
  sanitizeIcon,
  ALLOWED_ICONS,
};

