import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branding, setBranding] = useState({
    dashboardName: 'Aether Dashboard',
    dashboardShortName: 'Aether',
    sidebarLogoUrl: '',
    mainLogoUrl: '',
  });
  const [brandingLoading, setBrandingLoading] = useState(true);

  /**
   * Apply CSS variables to document root
   */
  const applyTheme = useCallback((themeConfig) => {
    if (!themeConfig) return;

    const root = document.documentElement;

    // Apply color variables
    if (themeConfig.colors) {
      root.style.setProperty('--theme-primary', themeConfig.colors.primary || '#3b82f6');
      root.style.setProperty('--theme-secondary', themeConfig.colors.secondary || '#8b5cf6');
      root.style.setProperty('--theme-sidebar-bg', themeConfig.colors.sidebarBg || 'linear-gradient(to bottom, #1f2937, #111827)');
      root.style.setProperty('--theme-sidebar-text', themeConfig.colors.sidebarText || '#ffffff');
      root.style.setProperty('--theme-sidebar-hover', themeConfig.colors.sidebarHover || 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--theme-nav-active', themeConfig.colors.navActive || 'linear-gradient(to right, #3b82f6, #06b6d4)');
      root.style.setProperty('--theme-background', themeConfig.colors.background || 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)');
      root.style.setProperty('--theme-card-bg', themeConfig.colors.cardBg || 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--theme-text-primary', themeConfig.colors.textPrimary || '#111827');
      root.style.setProperty('--theme-text-secondary', themeConfig.colors.textSecondary || '#6b7280');
    }

    // Apply navigation variables
    if (themeConfig.navigation) {
      root.style.setProperty('--theme-nav-dashboard', themeConfig.navigation.dashboard || 'linear-gradient(to right, #3b82f6, #06b6d4)');
      root.style.setProperty('--theme-nav-servers', themeConfig.navigation.servers || 'linear-gradient(to right, #a855f7, #ec4899)');
      root.style.setProperty('--theme-nav-earnCoins', themeConfig.navigation.earnCoins || 'linear-gradient(to right, #10b981, #14b8a6)');
      root.style.setProperty('--theme-nav-store', themeConfig.navigation.store || 'linear-gradient(to right, #f59e0b, #f97316)');
      root.style.setProperty('--theme-nav-admin', themeConfig.navigation.admin || 'linear-gradient(to right, #ef4444, #f43f5e)');
    }

    // Apply background variables
    if (themeConfig.background) {
      const bgImage = themeConfig.background.image 
        ? `url("${themeConfig.background.image}")` 
        : 'none';
      root.style.setProperty('--theme-background-image', bgImage);
      root.style.setProperty('--theme-background-overlay', themeConfig.background.overlay || 'rgba(0, 0, 0, 0)');
      root.style.setProperty('--theme-background-position', themeConfig.background.position || 'center');
      root.style.setProperty('--theme-background-size', themeConfig.background.size || 'cover');
      root.style.setProperty('--theme-background-repeat', themeConfig.background.repeat || 'no-repeat');
    }

    // Apply custom CSS
    if (themeConfig.customCSS) {
      let styleElement = document.getElementById('theme-custom-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'theme-custom-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = themeConfig.customCSS;
    } else {
      // Remove custom CSS if empty
      const styleElement = document.getElementById('theme-custom-css');
      if (styleElement) {
        styleElement.remove();
      }
    }
  }, []);

  /**
   * Get default theme configuration
   */
  const getDefaultTheme = useCallback(() => {
    return {
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
    };
  }, []);

  /**
   * Load theme from API
   */
  const loadTheme = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, apply default theme silently
        const defaultTheme = getDefaultTheme();
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
        setLoading(false);
        return;
      }
      
      const response = await api.get('/admin/settings/theme');
      const themeConfig = response.data;
      setTheme(themeConfig);
      applyTheme(themeConfig);
    } catch (err) {
      console.error('Failed to load theme:', err);
      
      // Handle 401 errors gracefully (user not authenticated)
      if (err.response?.status === 401) {
        // Silently apply default theme without showing error
        const defaultTheme = getDefaultTheme();
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
        setLoading(false);
        return;
      }
      
      setError(err.message);
      // Apply default theme on other errors
      const defaultTheme = getDefaultTheme();
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  }, [applyTheme, getDefaultTheme]);

  /**
   * Update theme
   */
  const updateTheme = useCallback(async (themeConfig) => {
    try {
      await api.put('/admin/settings/theme', themeConfig);
      setTheme(themeConfig);
      applyTheme(themeConfig);
      return { success: true };
    } catch (err) {
      console.error('Failed to update theme:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || err.message 
      };
    }
  }, [applyTheme]);

  /**
   * Preview theme (apply without saving)
   */
  const previewTheme = useCallback((themeConfig) => {
    applyTheme(themeConfig);
  }, [applyTheme]);

  /**
   * Get default branding configuration
   */
  const getDefaultBranding = useCallback(() => {
    return {
      dashboardName: 'Aether Dashboard',
      dashboardShortName: 'Aether',
      sidebarLogoUrl: '',
      mainLogoUrl: '',
    };
  }, []);

  /**
   * Load branding from API
   */
  const loadBranding = useCallback(async () => {
    try {
      setBrandingLoading(true);
      
      // Check if user is authenticated before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, apply default branding silently
        const defaultBranding = getDefaultBranding();
        setBranding(defaultBranding);
        setBrandingLoading(false);
        return;
      }
      
      const response = await api.get('/admin/settings/branding');
      const brandingConfig = response.data;
      setBranding(brandingConfig);
    } catch (err) {
      console.error('Failed to load branding:', err);
      
      // Handle 401 errors gracefully (user not authenticated)
      if (err.response?.status === 401) {
        // Silently apply default branding without showing error
        const defaultBranding = getDefaultBranding();
        setBranding(defaultBranding);
        setBrandingLoading(false);
        return;
      }
      
      // Apply default branding on other errors
      const defaultBranding = getDefaultBranding();
      setBranding(defaultBranding);
    } finally {
      setBrandingLoading(false);
    }
  }, [getDefaultBranding]);

  // Load theme and branding on mount
  // Load theme first, then branding to ensure proper initialization order
  useEffect(() => {
    const initializeThemeAndBranding = async () => {
      // Load theme first as it's more critical for initial render
      await loadTheme();
      // Then load branding after theme is loaded
      await loadBranding();
    };
    
    initializeThemeAndBranding();
  }, [loadTheme, loadBranding]);

  const value = {
    theme,
    loading,
    error,
    loadTheme,
    updateTheme,
    previewTheme,
    applyTheme,
    branding,
    brandingLoading,
    loadBranding,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

