
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchVehiclesByCustomer } from '@/lib/data';
import { createBudgetRequest } from '@/lib/mutations';
import type { Vehicle } from '@/lib/types';
import { useRouter } from 'next/navigation';

const requestSchema = z.object({
  vehicleId: z.string().min(1, 'Debes seleccionar un vehículo.'),
  description: z.string().min(10, 'Por favor, describe con más detalle lo que necesitas.').max(500, 'La descripción no puede superar los 500 caracteres.'),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function RequestBudgetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      vehicleId: '',
      description: '',
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoadingVehicles(true);
      fetchVehiclesByCustomer(user.id)
        .then(setVehicles)
        .catch(() => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron cargar tus vehículos.',
          });
        })
        .finally(() => setIsLoadingVehicles(false));
    }
  }, [user, toast]);

  const onSubmit = (data: RequestFormData) => {
    if (!user) return;

    startTransition(async () => {
      try {
        const selectedVehicle = vehicles.find(v => v.id === data.vehicleId);
        if (!selectedVehicle) {
            toast({ variant: 'destructive', title: 'Error', description: 'El vehículo seleccionado no es válido.' });
            return;
        }

        await createBudgetRequest({
            ...data,
            customerId: user.id,
            customerName: user.name,
            customerEmail: user.email,
            vehicleIdentifier: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`
        });

        toast({
          title: '¡Solicitud Enviada!',
          description: 'Hemos recibido tu solicitud de presupuesto. Te notificaremos cuando esté listo.',
        });
        
        router.push('/portal/budgets');

      } catch (error) {
        console.error("Error creating budget request:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo enviar tu solicitud. Inténtalo de nuevo.',
        });
      }
    });
  };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
            <CardTitle>Solicitar Nuevo Presupuesto</CardTitle>
            <CardDescription>
                Selecciona tu vehículo y describe el servicio que necesitas. Te enviaremos una cotización a la brevedad.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="vehicleId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tu Vehículo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingVehicles || vehicles.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingVehicles ? "Cargando vehículos..." : "Selecciona un vehículo"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Si no encuentras tu vehículo, contáctanos.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Describe tu Necesidad</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        placeholder="Ej: Necesito la revisión de los 10.000km, o siento un ruido extraño en el motor al acelerar."
                                        rows={5}
                                        {...field}
                                        />
                                    </FormControl>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Solicitud
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </AuthGuard>
  );
}
