
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { fetchReceipts } from '@/lib/data';
import type { Receipt } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function ReceiptsPage() {
    const { toast } = useToast();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    
    const formatDate = (timestamp: any) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
        }
        return 'Fecha inválida';
    }

    useEffect(() => {
        const loadReceipts = async () => {
            setLoading(true);
            try {
                const data = await fetchReceipts();
                setReceipts(data);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'No se pudieron cargar los comprobantes.',
                });
            } finally {
                setLoading(false);
            }
        };

        loadReceipts();
    }, [toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comprobantes de Venta</CardTitle>
                <CardDescription>Un listado de todos los comprobantes generados.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Comprobante</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
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
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : receipts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No hay comprobantes para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            receipts.map(receipt => (
                                <TableRow key={receipt.id}>
                                    <TableCell className="font-mono text-xs">#{receipt.id?.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{receipt.customerName}</TableCell>
                                    <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/sales/receipts/${receipt.id}`}>
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
    );
}
