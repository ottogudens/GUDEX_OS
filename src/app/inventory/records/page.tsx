
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchStockLogs } from '@/lib/data';
import type { StockLog } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StockRecordsPage() {
    const { toast } = useToast();
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            setLoading(true);
            try {
                const data = await fetchStockLogs();
                setLogs(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial de movimientos de stock.' });
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, [toast]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm');
    };

    return (
      <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
        <Card>
            <CardHeader>
                <CardTitle>Registros de Movimientos de Stock</CardTitle>
                <CardDescription>Historial de todas las modificaciones de inventario realizadas en el sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead className="text-center">Stock Anterior</TableHead>
                            <TableHead className="text-center">Stock Nuevo</TableHead>
                            <TableHead className="text-right">Cambio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length > 0 ? (
                            logs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                                    <TableCell>{log.user.name}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{log.productName}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{log.productCode}</div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{log.reason}</Badge></TableCell>
                                    <TableCell className="text-center">{log.oldStock}</TableCell>
                                    <TableCell className="text-center">{log.newStock}</TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold flex items-center justify-end gap-1",
                                        log.change > 0 ? 'text-green-500' : 'text-destructive'
                                    )}>
                                        {log.change > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                        {Math.abs(log.change)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No hay registros de movimientos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </AuthGuard>
    );
}
