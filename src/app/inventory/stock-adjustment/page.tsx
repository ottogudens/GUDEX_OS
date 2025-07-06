
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlidersHorizontal } from 'lucide-react';

export default function StockAdjustmentPage() {
  return (
    <AuthGuard allowedRoles={['Administrador']}>
       <Card>
        <CardHeader>
          <CardTitle>Ajuste de Inventario</CardTitle>
          <CardDescription>
            Modifica manualmente el stock de productos por motivos como mermas, donaciones o correcciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
            <SlidersHorizontal className="w-12 h-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Módulo en Construcción</h2>
            <p className="mt-2 text-muted-foreground">
                Esta sección permitirá buscar productos y ajustar su cantidad de stock con una justificación.
            </p>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
