
"use client";

import { useEffect, useState, useTransition } from 'react';
import { AreaChart, BadgeCheck, Car, CircleDollarSign, Clock, Users, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart as BarChartComponent,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import { AuthGuard } from '@/components/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchDashboardData, fetchAppointmentRequests, fetchAppointmentsByDate } from '@/lib/data';
import type { DashboardData, AppointmentRequest, Appointment } from '@/lib/types';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const chartConfig = {
  revenue: {
    label: 'Ingresos',
    color: 'hsl(var(--chart-1))',
  },
};

const getStatusVariant = (status: string) => {
    switch(status) {
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

const getStatusText = (status: string) => {
    const map: { [key: string]: string } = {
        backlog: 'Pendiente',
        inProgress: 'En Progreso',
        approval: 'En Aprobación',
        completed: 'Completado',
        paid: 'Pagado'
    };
    return map[status] || status;
};

const StatCard = ({ title, value, icon, description, loading, colorClass }: { title: string, value: string, icon: React.ReactNode, description: string, loading: boolean, colorClass?: string }) => (
    <Card className={cn("transition-all hover:shadow-md", colorClass)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {loading ? (
                <>
                    <Skeleton className="mt-1 h-8 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </>
            )}
        </CardContent>
    </Card>
);

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [appointmentsData, setAppointmentsData] = useState<{
      pendingRequests: AppointmentRequest[];
      confirmedAppointments: Appointment[];
    } | null>(null);
    const [loadingAppointments, setLoadingAppointments] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const loadData = () => {
        startTransition(async () => {
            try {
                setLoading(true);
                const dashboardData = await fetchDashboardData();
                setData(dashboardData);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del panel.' });
            } finally {
                setLoading(false);
            }
        });
    };

    const loadAppointments = () => {
        startTransition(async () => {
            try {
                setLoadingAppointments(true);
                const pendingRequests = await fetchAppointmentRequests();
                const todayAppointments = await fetchAppointmentsByDate(new Date());
                
                const confirmedAppointments = todayAppointments.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

                setAppointmentsData({
                    pendingRequests,
                    confirmedAppointments
                });
            } catch (error) {
                console.error("Failed to load appointments data", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las citas.' });
            } finally {
                setLoadingAppointments(false);
            }
        });
    };

    useEffect(() => {
        loadData();
        loadAppointments();
    }, []);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    const formatDateForTable = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return "Hoy";
        if (isYesterday(date)) return "Ayer";
        return format(date, "P", { locale: es });
    };
    
    const formatDateTimeForTable = (dateStr: string) => {
        const date = new Date(dateStr);
        return format(date, "P p", { locale: es });
    };

    return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="flex animate-fade-in-up flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ingresos Caja Activa"
            value={data ? formatCurrency(data.activeCashRegisterRevenue) : '$0'}
            icon={<CircleDollarSign className="h-4 w-4 text-green-500" />}
            description="Ventas de la sesión actual"
            loading={loading}
            colorClass="hover:border-green-500/50"
          />
          <StatCard
            title="Órdenes Activas"
            value={data ? data.activeOrders.toString() : '0'}
            icon={<Wrench className="h-4 w-4 text-blue-500" />}
            description="Pendientes, en progreso o aprobación"
            loading={loading}
            colorClass="hover:border-blue-500/50"
          />
          <StatCard
            title="Completadas este Mes"
            value={data ? data.completedThisMonth.toString() : '0'}
            icon={<BadgeCheck className="h-4 w-4 text-indigo-500" />}
            description="Ventas en los últimos 30 días"
            loading={loading}
            colorClass="hover:border-indigo-500/50"
          />
           <StatCard
            title="Nuevos Clientes"
            value={data ? data.newCustomersThisMonth.toString() : '0'}
            icon={<Users className="h-4 w-4 text-orange-500" />}
            description="En los últimos 30 días"
            loading={loading}
            colorClass="hover:border-orange-500/50"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AreaChart className="h-5 w-5" /> Resumen de Ingresos (Últimos 6 días)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              {loading || !data || !data.dailyRevenue || data.dailyRevenue.length === 0 ? (
                <div className="flex min-h-[250px] w-full items-center justify-center">
                    {loading ? <Skeleton className="h-full w-full" /> : <p className="text-muted-foreground">No hay datos de ingresos para mostrar.</p>}
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                  <BarChartComponent accessibilityLayer data={data.dailyRevenue}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), "EEE", { locale: es })}
                    />
                     <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        formatter={(value, name, payload) => (
                            <div className='flex flex-col'>
                                <span className='font-semibold'>{format(new Date(payload.payload.day), "eeee, dd MMMM", { locale: es })}</span>
                                <span>{formatCurrency(value as number)}</span>
                            </div>
                        )} 
                        indicator="dot" 
                      />}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      radius={4}
                    />
                  </BarChartComponent>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Un registro de las órdenes de trabajo más recientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || !data?.recentActivity ? (
                     Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                        </TableRow>
                     ))
                  ) : (
                    data.recentActivity.length > 0 ? (
                      data.recentActivity.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-mono text-xs font-semibold">#{activity.id}</TableCell>
                          <TableCell>{activity.customer}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusVariant(activity.status)}
                              className={cn({
                                'bg-accent text-accent-foreground': activity.status === 'approval',
                                'border-primary/50 text-primary': activity.status === 'inProgress'
                              })}
                            >
                              {getStatusText(activity.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No hay actividad reciente.
                        </TableCell>
                      </TableRow>
                    )
                   )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Citas Pendientes de Confirmación</CardTitle>
              <CardDescription>
                Solicitudes de cita de clientes que aún no han sido confirmadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Solicitud</TableHead>
                    <TableHead>Fecha Solicitada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAppointments ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-3" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      </TableRow>
                   ))
                  ) : (
                    appointmentsData?.pendingRequests && appointmentsData.pendingRequests.length > 0 ? (
                      appointmentsData.pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                           <TableCell>
                             {isToday(new Date(request.requestedDate)) && (
                              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" title="Solicitud para hoy" />
                             )}
                           </TableCell>
                          <TableCell>{request.customerName}</TableCell>
                          <TableCell>{request.notes || 'Sin detalles'}</TableCell>
                          <TableCell>{formatDateForTable(request.requestedDate)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                       <TableRow>
                        <TableCell colSpan={4} className="h-12 text-center text-muted-foreground">
                          No hay solicitudes de cita pendientes.
                        </TableCell>
                      </TableRow>
                     )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
             <CardHeader>
              <CardTitle>Próximas Citas Confirmadas</CardTitle>
              <CardDescription>
                Citas agendadas para los próximos días.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Servicio</TableHead>
                     <TableHead>Fecha y Hora</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {loadingAppointments ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                             <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        </TableRow>
                     ))
                   ) : (
                    appointmentsData?.confirmedAppointments && appointmentsData.confirmedAppointments.length > 0 ? (
                      appointmentsData.confirmedAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{appointment.customerName}</TableCell>
                          <TableCell>{appointment.vehicleDescription}</TableCell>
                          <TableCell>{appointment.service}</TableCell>
                           <TableCell>{formatDateTimeForTable(appointment.appointmentDate)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                       <TableRow>
                        <TableCell colSpan={4} className="h-12 text-center text-muted-foreground">
                          No hay citas confirmadas próximamente.
                        </TableCell>
                      </TableRow>
                     )
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </AuthGuard>
  );
}
