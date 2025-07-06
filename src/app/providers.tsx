
'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SettingsProvider>
          {children}
          <Toaster />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
