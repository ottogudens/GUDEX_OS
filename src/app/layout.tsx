
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'GUDEX-OS',
  description: 'El Sistema Definitivo para la Gestión de Talleres',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className="font-body antialiased bg-background" suppressHydrationWarning>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
