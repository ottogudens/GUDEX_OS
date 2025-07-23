
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Customer, Vehicle } from '@/lib/types';
import { createAppointment } from '@/lib/mutations';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { fetchCustomers, fetchVehiclesByCustomer } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const appointmentSchema = z.object({
  customerId: z.string().min(1, 'Seleccione un cliente.'),
  vehicleId: z.string().min(1, 'Seleccione un vehículo.'),
  service: z.string().min(1, 'El servicio es obligatorio.'),
  appointmentDate: z.string().min(1, 'La fecha es obligatoria.'),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AddAppointmentButtonProps {
  onSuccess: () => void;
}

export function AddAppointmentButton({ onSuccess }: AddAppointmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  const selectedCustomerId = watch('customerId');

  useState(() => {
    async function loadCustomers() {
      const fetchedCustomers = await fetchCustomers();
      setCustomers(fetchedCustomers);
    }
    loadCustomers();
  }, []);

  useState(() => {
    async function loadVehicles() {
      if (selectedCustomerId) {
        const fetchedVehicles = await fetchVehiclesByCustomer(selectedCustomerId);
        setVehicles(fetchedVehicles);
      } else {
        setVehicles([]);
      }
    }
    loadVehicles();
  }, [selectedCustomerId]);

  const onSubmit = (data: AppointmentFormData) => {
    startTransition(async () => {
      const customer = customers.find(c => c.id === data.customerId);
      const vehicle = vehicles.find(v => v.id === data.vehicleId);

      if (!customer || !vehicle) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cliente o vehículo no encontrado.' });
        return;
      }

      const appointmentData = {
        ...data,
        customerName: customer.name,
        vehicleDescription: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        status: 'Confirmada' as const,
        appointmentDate: new Date(data.appointmentDate),
      };

      const result = await createAppointment(appointmentData);

      if (result.success) {
        toast({ title: 'Éxito', description: 'Cita creada correctamente.' });
        onSuccess();
        setOpen(false);
        reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'No se pudo crear la cita.',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agendar Cita
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
          <DialogDescription>
            Complete los detalles para agendar una nueva cita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerId">Cliente</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicleId">Vehículo</Label>
             <Controller
              name="vehicleId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Seleccione un vehículo" /></SelectTrigger>
                    <SelectContent>
                        {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{`${v.make} ${v.model} (${v.licensePlate})`}</SelectItem>)}
                    </SelectContent>
                </Select>
              )}
            />
            {errors.vehicleId && <p className="text-red-500 text-xs">{errors.vehicleId.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service">Servicio</Label>
            <Input id="service" {...register('service')} />
            {errors.service && <p className="text-red-500 text-xs">{errors.service.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="appointmentDate">Fecha y Hora</Label>
            <Input id="appointmentDate" type="datetime-local" {...register('appointmentDate')} />
            {errors.appointmentDate && <p className="text-red-500 text-xs">{errors.appointmentDate.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Agendando...' : 'Agendar Cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
