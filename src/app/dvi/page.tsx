
"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, List, FileText } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';
import { fetchInspections } from '@/lib/server-data'; // This function needs to be created
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DVI } from '@/lib/types'; // Assuming DVI type exists
import { format } from 'date-fns';

export default function DVIPage() {
  const { data: inspections, isLoading, isError } = useQuery<DVI[]>({
    queryKey: ['dvi-inspections'],
    queryFn: fetchInspections,
  });

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">Inspecciones Vehiculares (DVI)</h1>
                <p className="text-muted-foreground">Crea, gestiona y revisa inspecciones digitales.</p>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                    <Link href="/dvi/templates">
                        <List className="mr-2 h-4 w-4" />
                        Gestionar Plantillas
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/dvi/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Inspección
                    </Link>
                </Button>
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inspecciones Recientes</CardTitle>
            <CardDescription>
              Listado de las últimas inspecciones realizadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : isError ? (
                 <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No se pudieron cargar las inspecciones.</AlertDescription>
                </Alert>
            ) : inspections && inspections.length > 0 ? (
              <ul className="space-y-4">
                {inspections.map((inspection) => (
                  <li key={inspection.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{inspection.vehicle.make} {inspection.vehicle.model} ({inspection.vehicle.plate})</p>
                      <p className="text-sm text-muted-foreground">
                        Realizada por {inspection.inspector.name} el {format(inspection.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <Button asChild variant="secondary">
                        <Link href={`/dvi/${inspection.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Informe
                        </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold">No hay inspecciones</h3>
                    <p className="text-muted-foreground">Inicia una nueva inspección para comenzar.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AuthGuard>
  );
}
