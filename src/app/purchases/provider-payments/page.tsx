"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function ProviderPaymentsPage() {
  return (
    <AuthGuard allowedRoles={['Administrador']}>
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard />
            Pagos a Proveedores
          </CardTitle>
          <CardDescription>
            Registra y gestiona los pagos de facturas a tus proveedores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
            <CreditCard className="w-12 h-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Módulo en Construcción</h2>
            <p className="mt-2 text-muted-foreground">
                Esta sección permitirá registrar los pagos realizados a proveedores, asociarlos a facturas de compra y llevar un control de cuentas por pagar.
            </p>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
