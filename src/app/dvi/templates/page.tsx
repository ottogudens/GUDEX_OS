
"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { DVITemplate } from '@/lib/types';
import { fetchDVITemplatesAction, createDVITemplateAction, deleteDVITemplateAction } from './actions';
import Link from 'next/link';

export default function DVITemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: templates, isLoading, isError } = useQuery<DVITemplate[]>({
    queryKey: ['dvi-templates'],
    queryFn: fetchDVITemplatesAction,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createDVITemplateAction(name),
    onSuccess: (result) => {
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ['dvi-templates'] });
            toast({ title: 'Éxito', description: result.message });
            setIsModalOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: `Ocurrió un error inesperado: ${error.message}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDVITemplateAction,
    onSuccess: (result) => {
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ['dvi-templates'] });
            toast({ title: 'Éxito', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: `Ocurrió un error inesperado: ${error.message}` });
    }
  });
  
  const handleCreateTemplate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    createMutation.mutate(name);
  };

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">Plantillas de Inspección</h1>
                <p className="text-muted-foreground">Crea y gestiona las plantillas para las inspecciones vehiculares.</p>
            </div>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Plantilla
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleCreateTemplate}>
                        <DialogHeader>
                            <DialogTitle>Nueva Plantilla de Inspección</DialogTitle>
                            <DialogDescription>
                                Asigna un nombre a tu nueva plantilla. Podrás añadir secciones y puntos de inspección después de crearla.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="name">Nombre de la Plantilla</Label>
                            <Input id="name" name="name" placeholder="Ej: Inspección de 30 Puntos" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Creando...' : 'Crear Plantilla'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plantillas Existentes</CardTitle>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : isError ? (
                 <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No se pudieron cargar las plantillas.</AlertDescription>
                </Alert>
            ) : templates && templates.length > 0 ? (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <span className="font-medium">{template.name}</span>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dvi/templates/${template.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(template.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold">No hay plantillas creadas</h3>
                    <p className="text-muted-foreground">Crea tu primera plantilla para empezar a realizar inspecciones.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AuthGuard>
  );
}
