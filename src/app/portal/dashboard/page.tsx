
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Car, Calendar, AlertTriangle, Wrench } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchWorkOrdersByCustomerId, fetchVehiclesByCustomerId } from '@/lib/data'; // Import fetchVehiclesByCustomerId
import type { WorkOrder } from '@/lib/types';

type Vehicle = {
    id: number;
    make: string;
    model: string;
    year: number;
    vin: string;
    lastService: string;
};

type Appointment = {
    id: number;
    date: string;
    time: string;
    service: string;
};

type MaintenanceSuggestion = {
    id: number;
    service: string;
    reason: string;
    vehicle: string;
};


const getStatusVariant = (status: WorkOrder['status']) => {
    switch (status) {
        case 'completed':
        case 'paid':
            return 'secondary';
        case 'approval':
            return 'default';
        case 'inProgress':
            return 'outline';
        case 'backlog':
        default:
            return 'destructive';
    }
};

const getStatusText = (status: WorkOrder['status']) => {
    const map: { [key: string]: string } = {
        backlog: 'Pendiente',
        inProgress: 'En Progreso',
        approval: 'En Aprobación',
        completed: 'Completado',
        paid: 'Pagado'
    };
    return map[status] || status;
};

export default function ClientPortalDashboard() {
    const [workHistory, setWorkHistory] = useState<WorkOrder[]>([]);
    const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [suggestedMaintenance, setSuggestedMaintenance] = useState<MaintenanceSuggestion[]>([]);


    const [loadingWorkHistory, setLoadingWorkHistory] = useState(true);
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [loadingUpcomingAppointments, setLoadingUpcomingAppointments] = useState(true);
    const [loadingSuggestedMaintenance, setLoadingSuggestedMaintenance] = useState(true);

    const { user } = useAuth(); // Moved user hook here
  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
        // Cargar Historial de Órdenes de Trabajo
        setLoadingWorkHistory(true); // Usa el nuevo estado
        try {
            const historyData = await fetchWorkOrdersByCustomerId(user.id);
            setWorkHistory(historyData);
        } catch (error) {
            console.error("Failed to fetch client work orders:", error);
        } finally {
            setLoadingWorkHistory(false); // Usa el nuevo estado
        }
  
        // Cargar Vehículos del Cliente
        setLoadingVehicles(true); // Usa el nuevo estado
        try {
            // Asegúrate de que fetchVehiclesByCustomerId esté importada al inicio del archivo
            const vehiclesData = await fetchVehiclesByCustomerId(user.id);
            setCustomerVehicles(vehiclesData);
        } catch (error) {
            console.error("Failed to fetch client vehicles:", error);
        } finally {
            setLoadingVehicles(false); // Usa el nuevo estado
        }
  
        // TODO: Implementar fetching y estados de carga para Citas Próximas
        // Descomenta y usa el estado si implementas el fetching
        // setLoadingUpcomingAppointments(true);
        // try {
        //     const appointmentsData = await fetchUpcomingAppointmentsByCustomerId(user.id); // Necesitas crear esta función en @/lib/data.ts
        //     setUpcomingAppointments(appointmentsData);
        // } catch (error) {
        //     console.error("Failed to fetch upcoming appointments:", error);
        // } finally {
        //     setLoadingUpcomingAppointments(false);
        // }
  
        // TODO: Implementar fetching y estados de carga para Sugerencias de Mantención
        // Descomenta y usa el estado si implementas el fetching
        // setLoadingSuggestedMaintenance(true);
        // try {
        //     const suggestionsData = await fetchSuggestedMaintenanceByCustomerId(user.id); // Necesitas crear esta función en @/lib/data.ts
        //     setSuggestedMaintenance(suggestionsData);
        // } catch (error) {
        //     console.error("Failed to fetch suggested maintenance:", error);
        // } finally {
        //     setLoadingSuggestedMaintenance(false);
        // }
      }
      loadData();
  }, [user]);

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.seconds) {
        return format(new Date(timestamp.seconds * 1000), 'd MMMM, yyyy', { locale: es });
    }
    return 'Fecha desconocida';
  };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Bienvenido de nuevo, {user?.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground">Aquí tienes un resumen de la actividad de tu cuenta.</p>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Car /> Mis Vehículos</CardTitle>
                        <CardDescription>Vehículos registrados en tu cuenta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingVehicles ? (
                             Array.from({ length: 1 }).map((_, i) => (
                                <div key={i} className="space-y-2 p-3 border rounded-md">
                                    <Skeleton className="h-5 w-3/5" />
                                </div>
                            ))
                        ) : customerVehicles.length > 0 ? (
                            <div className="space-y-4">
                                {customerVehicles.map(vehicle => (
                                    <div key={vehicle.id} className="p-3 border rounded-md">
                                        <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                        <p className="text-xs text-muted-foreground">Último servicio: {vehicle.lastService}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4">No tienes vehículos registrados.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar /> Próximas Citas</CardTitle>
                        <CardDescription>Tus citas agendadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loadingUpcomingAppointments ? ( // Corrected loading state
                             Array.from({ length: 1 }).map((_, i) => (
                                <div key={i} className="space-y-2 p-3 border rounded-md">
                                    <Skeleton className="h-5 w-3/5" />
                                </div>
                            ))
                         ) : upcomingAppointments.length > 0 ? upcomingAppointments.map(apt => (
                             <div key={apt.id} className="p-3 border rounded-md">
                                <p className="font-semibold">{apt.service}</p>
                                <p className="text-sm text-muted-foreground">{apt.date} a las {apt.time}</p>
                            </div>
                        )) : <p className="text-sm text-muted-foreground py-4">No tienes citas próximas.</p>}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wrench /> Historial de Órdenes de Trabajo</CardTitle>
                         <CardDescription>Resumen de los últimos servicios realizados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingWorkHistory ? ( // Corrected loading state
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-3/5" />
                                        <Skeleton className="h-6 w-24 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-2/5" />
                                    {i < 2 && <Separator className="mt-4" />}
                                </div>
                            ))
                        ) : workHistory.length > 0 ? (
                            workHistory.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-sm text-muted-foreground">{item.vehicle} &bull; {formatDate(item.createdAt)}</p>
                                        </div>
                                        <Badge variant={getStatusVariant(item.status)}>{getStatusText(item.status)}</Badge>
                                    </div>
                                    {index < workHistory.length - 1 && <Separator className="mt-4" />}
                                </div>
                            ))
                         ) : (
                            <p className="text-sm text-muted-foreground py-4">No hay historial de órdenes de trabajo.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-accent"/> Próximas Mantenciones Sugeridas</CardTitle>
                         <CardDescription>Recomendaciones basadas en tus inspecciones.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {loadingSuggestedMaintenance ? ( // Corrected loading state
                              Array.from({ length: 1 }).map((_, i) => (
                                <div key={i} className="space-y-2 p-3 border rounded-md">
                                    <Skeleton className="h-5 w-3/5" />
                                </div>
                            ))
                         ) : suggestedMaintenance.length > 0 ? (
                            suggestedMaintenance.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{item.service}</p>
                                            <p className="text-sm text-muted-foreground">{item.vehicle} &bull; {item.reason}</p>
                                        </div>
                                        <Button size="sm">Agendar</Button>
                                    </div>
                                     {index < suggestedMaintenance.length - 1 && <Separator className="mt-4" />}
                                </div>
                            ))
                        ) : (
                             <p className="text-sm text-muted-foreground py-4">No hay sugerencias por ahora.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    </AuthGuard>
  );
}
