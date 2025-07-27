
'use client';

import { useState, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileText, Sparkles, Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import type { Budget, BudgetRequest } from '@/lib/types';
import { BudgetFormDialog } from '@/components/BudgetFormDialog';
import { BudgetsTable } from './BudgetsTable'; // RSC
import { RequestsTable } from './RequestsTable'; // RSC
import { Skeleton } from '@/components/ui/skeleton';

// Esqueleto de UI para las tablas
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default function BudgetsPage() {
    const queryClient = useQueryClient();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
    const [prefillData, setPrefillData] = useState<Partial<Budget> | undefined>(undefined);

    const handleCreateClick = () => {
        setIsEditing(false);
        setSelectedBudget(undefined);
        setPrefillData(undefined);
        setIsFormOpen(true);
    };

    // TODO: La lógica de edición y creación desde solicitud necesita ser reconectada aquí
    // para pasar los datos correctos al BudgetFormDialog.

    return (
        <AuthGuard allowedRoles={['Administrador', 'Cajero', 'Mecanico']}>
            <Tabs defaultValue="requests">
                <div className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Presupuestos y Solicitudes</CardTitle>
                        <CardDescription>Gestiona las cotizaciones y solicitudes de tus clientes.</CardDescription>
                    </div>
                    <Button onClick={handleCreateClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Presupuesto Manual
                    </Button>
                </div>

                <TabsList className="mt-4">
                    <TabsTrigger value="requests">
                        <FileText className="mr-2 h-4 w-4" />
                        Solicitudes Pendientes
                    </TabsTrigger>
                    <TabsTrigger value="budgets">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Presupuestos Emitidos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Solicitudes de Clientes</CardTitle></CardHeader>
                        <CardContent>
                            <Suspense fallback={<TableSkeleton />}>
                                {/* @ts-ignore: Async-component-in-client-component is a valid pattern */}
                                <RequestsTable />
                            </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budgets" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Historial de Presupuestos</CardTitle></CardHeader>
                        <CardContent>
                           <Suspense fallback={<TableSkeleton />}>
                                {/* @ts-ignore: Async-component-in-client-component is a valid pattern */}
                                <BudgetsTable />
                           </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <BudgetFormDialog 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={() => {
                    setIsFormOpen(false);
                    // Ya no necesitamos invalidar con React Query, 
                    // una simple recarga de la página o una revalidación del path
                    // desde la acción del formulario haría el trabajo.
                    // Por ahora, lo dejamos así para que el diálogo se cierre.
                }}
                isEditing={isEditing}
                budget={selectedBudget}
                initialData={prefillData}
            />
        </AuthGuard>
    );
}
