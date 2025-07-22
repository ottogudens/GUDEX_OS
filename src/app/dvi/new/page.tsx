
"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, FileCheck, Loader2, PlusCircle } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from '@/hooks/use-toast';
import type { Vehicle, DVITemplate, User } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { fetchVehiclesAction, fetchDVITemplatesAction, createDVIAction } from './actions';
import { AddVehicleButton } from '@/components/AddVehicleButton';

type Step = 'select-vehicle' | 'select-template' | 'creating';

export default function NewDVIPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<Step>('select-vehicle');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DVITemplate | null>(null);

  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ['all-vehicles'],
    queryFn: fetchVehiclesAction,
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<DVITemplate[]>({
    queryKey: ['dvi-templates'],
    queryFn: fetchDVITemplatesAction,
    enabled: step === 'select-template', // Only fetch templates when needed
  });
  
  const createDVIMutation = useMutation({
    mutationFn: createDVIAction,
    onSuccess: (result) => {
      if (result.success && result.dviId) {
        toast({ title: 'Inspección Creada', description: 'Redirigiendo a la inspección...' });
        router.push(`/dvi/${result.dviId}`);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
        setStep('select-template'); // Go back to the previous step on failure
      }
    },
    onError: (error) => {
        toast({ variant: 'destructive', title: 'Error Inesperado', description: error.message });
        setStep('select-template');
    }
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setStep('select-template');
  };
  
  const handleSelectTemplate = (template: DVITemplate) => {
    setSelectedTemplate(template);
  };
  
  const handleStartInspection = () => {
    if (!selectedVehicle || !selectedTemplate || !user) {
        toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Se requiere un vehículo, una plantilla y un usuario.' });
        return;
    }
    setStep('creating');
    createDVIMutation.mutate({
        vehicle: selectedVehicle,
        template: selectedTemplate,
        user: user as User,
    });
  };
  
  const handleVehicleCreated = () => {
    // Re-fetch the vehicles list to include the new one
    queryClient.invalidateQueries({ queryKey: ['all-vehicles'] });
  }

  const renderStep = () => {
    switch(step) {
      case 'select-vehicle':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Seleccionar Vehículo</CardTitle>
              <CardDescription>Busca y selecciona el vehículo que deseas inspeccionar. Si no existe, puedes añadirlo.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVehicles ? <Skeleton className="h-48 w-full" /> : (
                <>
                    <Command className="mb-4">
                    <CommandInput placeholder="Buscar por patente, marca, modelo..." />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-4 text-center text-sm">
                                <p>No se encontraron vehículos.</p>
                                <p className="text-muted-foreground">Intenta con otra búsqueda o añade uno nuevo.</p>
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="Vehículos">
                        {vehicles?.map(vehicle => (
                            <CommandItem key={vehicle.id} onSelect={() => handleSelectVehicle(vehicle)} className="cursor-pointer">
                            <Car className="mr-2 h-4 w-4" />
                            <span>{vehicle.make} {vehicle.model} - <span className="font-mono">{vehicle.licensePlate}</span></span>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                    <AddVehicleButton onSuccess={handleVehicleCreated} />
                </>
              )}
            </CardContent>
          </Card>
        );
      case 'select-template':
        return (
          <Card>
            <CardHeader>
              <Button variant="ghost" size="sm" onClick={() => setStep('select-vehicle')} className="mb-2 w-fit p-1 h-auto">
                <ArrowLeft className="mr-2 h-4 w-4" /> Cambiar Vehículo
              </Button>
              <CardTitle>Paso 2: Seleccionar Plantilla</CardTitle>
              <CardDescription>
                Has seleccionado: <span className="font-semibold">{selectedVehicle?.make} {selectedVehicle?.model}</span>. 
                Ahora, elige la plantilla para la inspección.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTemplates ? <Skeleton className="h-48 w-full" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates?.map(template => (
                         <Button
                            key={template.id}
                            variant={selectedTemplate?.id === template.id ? 'default' : 'secondary'}
                            className="h-auto p-4 flex flex-col items-start text-left"
                            onClick={() => handleSelectTemplate(template)}
                        >
                            <div className="flex items-center gap-2 font-semibold">
                                <FileCheck className="h-5 w-5" />
                                <span>{template.name}</span>
                            </div>
                            <p className="text-xs font-normal mt-1">{template.sections.length} secciones</p>
                        </Button>
                    ))}
                </div>
              )}
              <Button size="lg" className="w-full" onClick={handleStartInspection} disabled={!selectedTemplate || createDVIMutation.isPending}>
                Iniciar Inspección
              </Button>
            </CardContent>
          </Card>
        );
        case 'creating':
            return (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h2 className="text-xl font-semibold">Creando Inspección...</h2>
                    <p className="text-muted-foreground">Por favor, espera un momento.</p>
                </div>
            );
    }
  };

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <main className="flex flex-col items-center p-4 sm:px-6 sm:py-0">
        <div className="w-full max-w-2xl">
            {renderStep()}
        </div>
      </main>
    </AuthGuard>
  );
}
