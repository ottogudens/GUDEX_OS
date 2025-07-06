
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PurchaseInvoicesPage() {
  return (
    <AuthGuard allowedRoles={['Administrador']}>
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText />
            Ingreso de Facturas de Compra
          </CardTitle>
          <CardDescription>
            Registra y gestiona las facturas de tus proveedores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Módulo en Construcción</h2>
            <p className="mt-2 text-muted-foreground">
                Esta sección permitirá registrar las facturas de compra, asociarlas a proveedores y actualizar el stock de productos.
            </p>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
