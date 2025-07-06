"use client";

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { fetchReceipts } from '@/lib/data';
import type { Receipt } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function SalesReceiptsPage() {
    const [receipts, setReceipts] = React.useState<Receipt[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        const loadReceipts = async () => {
            setLoading(true);
            try {
                const data = await fetchReceipts();
                setReceipts(data);
            } catch (error) {
                console.error("Failed to fetch receipts:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los comprobantes.' });
            } finally {
                setLoading(false);
            }
        };
        loadReceipts();
    }, [toast]);

    const handleDownload = (pdfAsBase64: string, saleId: string) => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${pdfAsBase64}`;
        link.download = `comprobante-${saleId.slice(-6).toUpperCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (timestamp: any) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
        }
        return 'Fecha inválida';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comprobantes de Venta</CardTitle>
                <CardDescription>Aquí puedes ver y descargar todos los comprobantes generados desde el POS.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Venta</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha de Emisión</TableHead>
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
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : receipts.length > 0 ? (
                            receipts.map(receipt => (
                                <TableRow key={receipt.id}>
                                    <TableCell className="font-mono text-xs">#{receipt.saleId.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell>{receipt.customerName}</TableCell>
                                    <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleDownload(receipt.pdfAsBase64, receipt.saleId)}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Descargar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No se han generado comprobantes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
