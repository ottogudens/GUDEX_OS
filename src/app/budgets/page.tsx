
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
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';

type Budget = {
    id: string;
    customer: string;
    vehicle: string;
    total: number;
    status: 'Aprobado' | 'Pendiente' | 'Rechazado';
};

export default function BudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Aprobado':
                return 'secondary';
            case 'Pendiente':
                return 'default';
            case 'Rechazado':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Presupuestos</CardTitle>
                        <CardDescription>Gestiona las cotizaciones para tus clientes.</CardDescription>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Presupuesto
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead># Presupuesto</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Vehículo</TableHead>
                                <TableHead className="text-right">Monto Total</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {budgets.length > 0 ? (
                                budgets.map((budget) => (
                                    <TableRow key={budget.id}>
                                        <TableCell className="font-medium">{budget.id}</TableCell>
                                        <TableCell>{budget.customer}</TableCell>
                                        <TableCell>{budget.vehicle}</TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(budget.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant={getStatusVariant(budget.status)}
                                                className={cn(budget.status === 'Pendiente' && 'bg-accent text-accent-foreground')}
                                            >
                                                {budget.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No hay presupuestos para mostrar.
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
