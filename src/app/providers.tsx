
'use client';

import { ReactNode, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            {children}
            <Toaster />
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
