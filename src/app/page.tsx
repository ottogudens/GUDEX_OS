
"use client";

import { useEffect, useState } from 'react';
import { Car, CircleDollarSign, Users, Wrench } from 'lucide-react';
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
import { fetchDashboardData } from '@/lib/data';
import type { DashboardData } from '@/lib/types';

const chartConfig = {
  revenue: {
    label: 'Ingresos',
    color: 'hsl(var(--accent))',
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
}

const StatCard = ({ title, value, icon, description, loading }: { title: string, value: string, icon: React.ReactNode, description: string, loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {loading ? (
                <>
                    <Skeleton className="h-8 w-3/4 mt-1" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
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

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const dashboardData = await fetchDashboardData();
            setData(dashboardData);
            setLoading(false);
        };
        loadData();
    }, []);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ingresos Totales"
            value={data ? formatCurrency(data.totalRevenue) : '$0'}
            icon={<CircleDollarSign className="h-4 w-4 text-muted-foreground" />}
            description="Desde el inicio"
            loading={loading}
          />
          <StatCard
            title="Órdenes Activas"
            value={data ? data.activeOrders.toString() : '0'}
            icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
            description="Pendientes, en progreso o aprobación"
            loading={loading}
          />
          <StatCard
            title="Completadas este Mes"
            value={data ? data.completedThisMonth.toString() : '0'}
            icon={<Car className="h-4 w-4 text-muted-foreground" />}
            description="Ventas en los últimos 30 días"
            loading={loading}
          />
           <StatCard
            title="Nuevos Clientes"
            value={data ? data.newCustomersThisMonth.toString() : '0'}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            description="En los últimos 30 días"
            loading={loading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Resumen de Ingresos (Últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              {loading || !data?.monthlyRevenue.length ? (
                <div className="flex min-h-[250px] w-full items-center justify-center">
                    {loading ? <Skeleton className="h-full w-full" /> : <p className="text-muted-foreground">No hay datos de ingresos para mostrar.</p>}
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                  <BarChartComponent accessibilityLayer data={data.monthlyRevenue}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                     <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />}
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
                  {loading || !data?.recentActivity.length ? (
                     Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                        </TableRow>
                     ))
                  ) : (
                    data.recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium font-mono text-xs">#{activity.id}</TableCell>
                        <TableCell>{activity.customer}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(activity.status)}
                            className={activity.status === 'approval' ? 'bg-accent text-accent-foreground' : ''}
                          >
                            {getStatusText(activity.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                   )}
                   {!loading && data && data.recentActivity.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No hay actividad reciente.
                      </TableCell>
                    </TableRow>
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
