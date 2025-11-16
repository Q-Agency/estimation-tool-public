import { useState, useEffect, useCallback } from 'react';

const API_MODE_STORAGE_KEY = 'api_mode';
const PRODUCTION_URL = 'https://infinite-wasp-terminally.ngrok-free.app/webhook';
const TEST_URL = 'https://infinite-wasp-terminally.ngrok-free.app/webhook-test';

export type ApiMode = 'test' | 'production';

export const useApiMode = () => {
  const [mode, setMode] = useState<ApiMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(API_MODE_STORAGE_KEY);
      return (stored === 'production' || stored === 'test') ? stored : 'test';
    }
    return 'test';
  });

  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    return mode === 'production' ? PRODUCTION_URL : TEST_URL;
  });

  useEffect(() => {
    const newUrl = mode === 'production' ? PRODUCTION_URL : TEST_URL;
    setApiBaseUrl(newUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'production' ? 'test' : 'production');
  }, []);

  return {
    mode,
    apiBaseUrl,
    toggleMode,
    setMode
  };
};

