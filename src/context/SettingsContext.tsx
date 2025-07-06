'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { WorkshopSettings } from '@/lib/types';
import { fetchWorkshopSettings } from '@/lib/data';

const DUMMY_LOGO_URL = 'https://placehold.co/200x66.png';

const defaultSettings: WorkshopSettings = {
    name: 'GUDEX-OS',
    rut: '',
    address: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    logoUrl: DUMMY_LOGO_URL,
};

interface SettingsContextType {
  settings: WorkshopSettings;
  loading: boolean;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkshopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedSettings = await fetchWorkshopSettings();
      setSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to load settings in context:", error);
      // Keep default settings on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
