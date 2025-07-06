
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/AuthGuard';

type Invoice = {
    id: string;
    customer: string;
    date: string;
    total: number;
    status: 'Pagada' | 'Pendiente';
};

export default function BillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const getStatusVariant = (status: string) => {
        return status === 'Pagada' ? 'secondary' : 'destructive';
    };

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Facturación</CardTitle>
                        <CardDescription>Crea y gestiona tus facturas electrónicas.</CardDescription>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Factura
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead># Factura</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha Emisión</TableHead>
                                <TableHead className="text-right">Monto Total</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.id}</TableCell>
                                        <TableCell>{invoice.customer}</TableCell>
                                        <TableCell>{invoice.date}</TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(invoice.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusVariant(invoice.status)}>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No hay facturas para mostrar.
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
