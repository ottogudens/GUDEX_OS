
"use client";

import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { fetchReceiptsByCustomerId } from '@/lib/data';
import type { Receipt } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';

export default function ClientReceiptsPage() {
    const { user } = useAuth();
    const [receipts, setReceipts] = React.useState<Receipt[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user?.id) return;

        const loadReceipts = async () => {
            setLoading(true);
            try {
                const data = await fetchReceiptsByCustomerId(user.id);
                setReceipts(data);
            } catch (error) {
                console.error("Failed to fetch receipts:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar tus comprobantes.' });
            } finally {
                setLoading(false);
            }
        };
        loadReceipts();
    }, [user, toast]);

    const handleDownload = (pdfAsBase64: string, saleId: string) => {
        try {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${pdfAsBase64}`;
            link.download = `comprobante-${saleId.slice(-6).toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error de Descarga', description: 'No se pudo generar el archivo PDF.' });
        }
    };

    const formatDate = (timestamp: any) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm');
        }
        return 'Fecha inválida';
    }

    return (
        <AuthGuard allowedRoles={['Cliente']}>
            <div className="space-y-6">
                 <div>
                    <h1 className="text-3xl font-bold">Mis Comprobantes</h1>
                    <p className="text-muted-foreground">Aquí puedes ver y descargar todos los comprobantes de tus compras.</p>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Venta</TableHead>
                                    <TableHead>Fecha de Emisión</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : receipts.length > 0 ? (
                                    receipts.map(receipt => (
                                        <TableRow key={receipt.id}>
                                            <TableCell className="font-mono text-xs">#{receipt.saleId.slice(-6).toUpperCase()}</TableCell>
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
                                        <TableCell colSpan={3} className="h-48">
                                             <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                                <FileText className="w-12 h-12 mb-4" />
                                                <p className="font-semibold">No tienes comprobantes.</p>
                                                <p className="text-sm">Cuando realices una compra, tus boletas aparecerán aquí.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
