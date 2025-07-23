
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { fetchSalesSummary } from '@/lib/data';
import type { Sale, SalesSummaryData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { DollarSign, BarChart, Eye } from 'lucide-react';
import Link from 'next/link';

const StatCard = ({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {loading ? (
                <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

export default function SalesSummaryPage() {
    const { toast } = useToast();
    const [summaryData, setSummaryData] = useState<SalesSummaryData | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };
    
    const formatDate = (timestamp: any) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
        }
        return 'Fecha inválida';
    }

    const handleSearch = async () => {
        if (!startDate || !endDate) {
            toast({
                variant: 'destructive',
                title: 'Fechas incompletas',
                description: 'Por favor, selecciona una fecha de inicio y de fin.',
            });
            return;
        }
        
        setLoading(true);
        try {
            const data = await fetchSalesSummary(new Date(startDate), new Date(endDate));
            setSummaryData(data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron buscar las ventas.',
            });
        } finally {
            setLoading(false);
        }
    };
    
    // Initial load for the last 7 days
    useEffect(() => {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);

        const end = today.toISOString().split('T')[0];
        const start = weekAgo.toISOString().split('T')[0];
        
        setStartDate(start);
        setEndDate(end);

        const initialFetch = async () => {
            setLoading(true);
            const data = await fetchSalesSummary(weekAgo, today);
            setSummaryData(data);
            setLoading(false);
        };

        initialFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Buscar Ventas por Fecha</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-1.5">
                        <label htmlFor="start-date">Desde</label>
                        <Input id="start-date" type="date" className="max-w-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                     <div className="grid gap-1.5">
                        <label htmlFor="end-date">Hasta</label>
                        <Input id="end-date" type="date" className="max-w-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? 'Buscando...' : 'Buscar'}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <StatCard 
                    title="Ventas Totales en Periodo"
                    value={summaryData ? formatCurrency(summaryData.totalSales) : '$0'}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    loading={loading}
                />
                 <StatCard 
                    title="Promedio por Venta"
                    value={summaryData ? formatCurrency(summaryData.averageSale) : '$0'}
                    icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
                    loading={loading}
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Comprobantes de Venta</CardTitle>
                        <CardDescription>Un listado de todas las transacciones en el rango seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Venta</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                     Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : !summaryData || summaryData.sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No hay ventas para mostrar en este rango de fechas.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    summaryData.sales.map(sale => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-mono text-xs">#{sale.id?.slice(-6).toUpperCase()}</TableCell>
                                            <TableCell>{sale.customerName}</TableCell>
                                            <TableCell>{formatDate(sale.createdAt)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/sales/receipts/${sale.id}`}>
                                                        <Eye className="mr-2 h-4 w-4"/>
                                                        Ver
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ítems Más Vendidos</CardTitle>
                        <CardDescription>Productos y servicios más populares en el rango.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ítem</TableHead>
                                    <TableHead className="text-right">Unidades</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : !summaryData || summaryData.bestSellers.length === 0 ? (
                                     <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                            No hay datos de ventas.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    summaryData.bestSellers.map(item => (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
