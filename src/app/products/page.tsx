
import { Suspense } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchProductsAction, fetchProductCategoriesAction } from './actions';
import { ProductsClientPage } from './ProductsClientPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductsPageProps {
  searchParams: {
    category?: string;
  };
}

function PageSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-12 w-full mb-4" />
                <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * Página de Productos (`/products`), renderizada en el servidor.
 * Obtiene los datos iniciales y los pasa al componente cliente.
 * Lee los `searchParams` para filtrar los datos en el servidor.
 */
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  
  // Obtenemos los datos en el servidor, aplicando el filtro si existe.
  const [initialProducts, categories] = await Promise.all([
    fetchProductsAction({ categoryId: searchParams.category }),
    fetchProductCategoriesAction()
  ]);

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico', 'Cajero']}>
        <Suspense fallback={<PageSkeleton />}>
            <ProductsClientPage initialProducts={initialProducts} categories={categories} />
        </Suspense>
    </AuthGuard>
  );
}
