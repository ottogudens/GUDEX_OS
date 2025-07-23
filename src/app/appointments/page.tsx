
"use client"; 

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { es } from 'date-fns/locale';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchAppointmentsByDate, fetchAppointmentRequests } from '@/lib/data';
import { confirmAppointment } from '@/lib/mutations';
import { Skeleton } from '@/components/ui/skeleton';
import type { Appointment, AppointmentRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { AddAppointmentButton } from '@/components/AddAppointmentButton';

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadData = () => {
    startTransition(async () => {
      try {
        const [requestsData, appointmentsData] = await Promise.all([
          fetchAppointmentRequests(),
          date ? fetchAppointmentsByDate(date) : Promise.resolve([]),
        ]);
        setRequests(requestsData);
        setAppointments(appointmentsData);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      }
    });
  };
  
  useEffect(() => {
    loadData();
  }, [date]);

  const handleConfirmRequest = async (request: AppointmentRequest) => {
    try {
        const vehicleIdString = request.vehicleIdentifier || request.vehicleDescription || 'Vehículo no especificado';
        
        let serviceDescription = request.service || request.description || 'Servicio no especificado';
        if (request.notes) {
            serviceDescription += ` (Notas: ${request.notes})`;
        }

        await confirmAppointment({
            customerId: request.customerId,
            customerName: request.customerName,
            vehicleId: request.vehicleId,
            vehicleIdentifier: vehicleIdString,
            service: serviceDescription,
            status: 'Confirmada',
            appointmentDate: new Date(request.requestedDate),
        }, request.id);

        toast({ title: 'Cita Confirmada', description: `La cita para ${request.customerName} ha sido agendada.` });
        loadData();
    } catch (error) {
        console.error("Error confirming appointment", error)
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la cita.' });
    }
  };


  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Calendario de Citas</CardTitle>
                        <CardDescription>Selecciona un día para ver y gestionar las citas.</CardDescription>
                    </div>
                    <AddAppointmentButton onSuccess={loadData} />
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                        locale={es}
                    />
                </CardContent>
            </Card>
             <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Citas para el {date ? format(date, 'PPP', { locale: es }) : '...'}</CardTitle>
                    <CardDescription>Estos son los vehículos agendados para este día.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                 {isPending && appointments.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                 ) : appointments.length > 0 ? (
                    appointments.map((apt) => (
                        <div key={apt.id} className="flex items-start gap-4 p-3 rounded-lg border">
                            <div className="font-bold text-lg text-primary flex flex-col items-center">
                                <span>{format(parseISO(apt.appointmentDate), 'HH:mm')}</span>
                            </div>
                            <div className="border-l pl-4">
                                <p className="font-semibold">{apt.customerName}</p>
                                <p className="text-sm text-muted-foreground">{apt.vehicleDescription}</p>
                                <p className="text-sm mt-1">{apt.service}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay citas para este día.</p>
                )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Solicitudes Pendientes
              </CardTitle>
              <CardDescription>Clientes esperando confirmación para su cita.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {isPending && requests.length === 0 ? (
                 Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : requests.length > 0 ? (
                requests.map((req) => (
                    <div key={req.id} className="p-3 rounded-lg border space-y-3">
                        <div>
                            <p className="font-semibold">{req.customerName}</p>
                            <p className="text-sm text-muted-foreground">{req.vehicleIdentifier}</p>
                        </div>
                         <p className="text-sm bg-muted p-2 rounded-md">"{req.description}"</p>
                         <p className="text-xs text-center font-medium text-primary">
                            Solicitada para: {format(parseISO(req.requestedDate), 'PPP p', { locale: es })}
                         </p>
                         <Button className="w-full" size="sm" onClick={() => handleConfirmRequest(req)}>
                            Confirmar y Agendar
                        </Button>
                    </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay solicitudes pendientes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
