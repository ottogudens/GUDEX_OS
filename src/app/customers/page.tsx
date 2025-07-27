
import { Suspense } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchCustomersAction } from './actions';
import { CustomersClientPage } from './CustomersClientPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * Esta es la página principal (`/customers`), que ahora es un Componente de Servidor (RSC).
 * Es 'async' y obtiene los datos directamente.
 */
export default async function CustomersPage() {
  
  // Realizamos la obtención de datos en el servidor.
  // La UI no se renderizará hasta que los datos estén listos.
  const initialCustomers = await fetchCustomersAction();

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico', 'Cajero']}>
        <Suspense fallback={<PageSkeleton />}>
            {/* El componente cliente recibe los datos iniciales como una prop. */}
            <CustomersClientPage initialCustomers={initialCustomers} />
        </Suspense>
    </AuthGuard>
  );
}
