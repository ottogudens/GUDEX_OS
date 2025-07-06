
"use client";

import * as React from 'react';
import { AuthGuard } from '@/components/AuthGuard';

export default function SalesLayout({ children }: { children: React.ReactNode }) {

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-headline">Gestión de Ventas</h1>
            <p className="text-muted-foreground">Analiza tus ventas, facturas, comprobantes y gestiona la caja.</p>
          </div>
        </div>
        
        <div className="mt-6">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
