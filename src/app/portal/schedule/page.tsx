"use client";

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { fetchVehiclesByCustomerId } from '@/lib/data';
import { createAppointment } from '@/lib/mutations';
import type { Vehicle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentRequestSchema } from '@/lib/schemas';
import { startOfDay } from 'date-fns';

const availableTimeSlots = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00",
];

export default function ClientSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user?.id) {
      const loadVehicles = async () => {
        setLoadingVehicles(true);
        try {
          const data = await fetchVehiclesByCustomerId(user.id);
          setVehicles(data);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar tus vehículos.' });
        } finally {
          setLoadingVehicles(false);
        }
      };
      loadVehicles();
    }
  }, [user, toast]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para agendar.' });
        return;
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle || !date || !timeSlot || !serviceType) {
        toast({ variant: 'destructive', title: 'Formulario incompleto', description: 'Por favor, completa todos los campos requeridos (*).' });
        return;
    }

    const requestedDate = new Date(date);
    const [hours, minutes] = timeSlot.split(':');
    requestedDate.setHours(parseInt(hours), parseInt(minutes));

    const dataToValidate = {
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        vehicleId: selectedVehicle.id,
        vehicleDescription: `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})`,
        service: serviceType,
        notes,
        requestedDate: requestedDate.toISOString(),
    };

    const validation = AppointmentRequestSchema.safeParse(dataToValidate);

    if (!validation.success) {
        toast({ variant: 'destructive', title: 'Error de validación', description: Object.values(validation.error.flatten().fieldErrors).flat().join(' ') });
        return;
    }

    startTransition(async () => {
        try {
            await createAppointment(validation.data);
            toast({
                title: '¡Solicitud Enviada!',
                description: 'Hemos recibido tu solicitud de cita. Nos pondremos en contacto pronto para confirmar.',
            });
            // Reset form
            setSelectedVehicleId('');
            setServiceType('');
            setDate(undefined);
            setTimeSlot('');
            setNotes('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al agendar', description: error.message || 'No se pudo enviar la solicitud.' });
        }
    });
  };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Agendar una Cita</h1>
                <p className="text-muted-foreground">Selecciona un servicio, fecha y hora para tu próxima visita.</p>
            </div>
            
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                               <Label htmlFor="vehicle">Tu Vehículo *</Label>
                               {loadingVehicles ? <Skeleton className="h-10 w-full" /> : (
                                   <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} required>
                                        <SelectTrigger id="vehicle">
                                            <SelectValue placeholder="Selecciona tu vehículo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.length > 0 ? (
                                                vehicles.map(v => <SelectItem key={v.id} value={v.id}>{`${v.make} ${v.model} (${v.licensePlate})`}</SelectItem>)
                                            ) : (
                                                <SelectItem value="none" disabled>No tienes vehículos registrados</SelectItem>
                                            )}
                                        </SelectContent>
                                   </Select>
                               )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service">Servicio Requerido *</Label>
                                <Select value={serviceType} onValueChange={setServiceType} required>
                                    <SelectTrigger id="service">
                                        <SelectValue placeholder="Selecciona un servicio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cambio de Aceite y Filtro">Cambio de Aceite y Filtro</SelectItem>
                                        <SelectItem value="Servicio de Frenos">Servicio de Frenos</SelectItem>
                                        <SelectItem value="Diagnóstico General">Diagnóstico General</SelectItem>
                                        <SelectItem value="Mantenimiento Preventivo">Mantenimiento Preventivo</SelectItem>
                                        <SelectItem value="Otro">Otro (describir en comentarios)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="notes">Comentarios Adicionales</Label>
                                <Textarea id="notes" placeholder="Describe el problema o tus necesidades con más detalle..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Selecciona una Fecha *</Label>
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-md border"
                                    locale={es}
                                    disabled={(d) => d < startOfDay(new Date()) || d.getDay() === 0 }
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="timeSlot">Selecciona una Hora *</Label>
                                <Select value={timeSlot} onValueChange={setTimeSlot} required>
                                    <SelectTrigger id="timeSlot">
                                        <SelectValue placeholder="Elige un horario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTimeSlots.map(time => (
                                            <SelectItem key={time} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="submit" size="lg" disabled={isPending}>
                            {isPending ? 'Enviando Solicitud...' : 'Confirmar Solicitud de Cita'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    </AuthGuard>
  );
}
