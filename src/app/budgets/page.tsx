
"use client";

import { useState, useEffect, useTransition } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle, Trash2, Edit, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import type { Budget, BudgetRequest } from '@/lib/types';
import { fetchBudgets, fetchBudgetRequests, deleteBudget, deleteBudgetRequest, fetchCustomerById, fetchVehicleById } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { BudgetFormDialog } from '@/components/BudgetFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type EnrichedBudget = Budget & {
    customerName: string;
    vehicleIdentifier: string;
};

export default function BudgetsPage() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [budgets, setBudgets] = useState<EnrichedBudget[]>([]);
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
    const [prefillData, setPrefillData] = useState<Partial<Budget> | undefined>(undefined);

    const loadData = () => {
        startTransition(async () => {
            try {
                const [fetchedBudgets, fetchedRequests] = await Promise.all([
                    fetchBudgets(),
                    fetchBudgetRequests(),
                ]);

                const enrichedBudgets = await Promise.all(
                    fetchedBudgets.map(async (budget) => {
                        const customer = await fetchCustomerById(budget.customerId);
                        const vehicle = await fetchVehicleById(budget.vehicleId);
                        return {
                            ...budget,
                            customerName: customer?.name ?? 'N/A',
                            vehicleIdentifier: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'N/A',
                        };
                    })
                );
                setBudgets(enrichedBudgets);
                setRequests(fetchedRequests);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
            }
        });
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Aprobado': return 'secondary';
            case 'Pendiente': return 'default';
            case 'Rechazado': return 'destructive';
            default: return 'outline';
        }
    };
    
    const handleCreateClick = () => {
        setIsEditing(false);
        setSelectedBudget(undefined);
        setPrefillData(undefined);
        setIsFormOpen(true);
    };

    const handleEditClick = (budget: Budget) => {
        setIsEditing(true);
        setSelectedBudget(budget);
        setPrefillData(undefined);
        setIsFormOpen(true);
    };
    
    const handleCreateFromRequest = (request: BudgetRequest) => {
        setIsEditing(false);
        setSelectedBudget(undefined);
        setPrefillData({
            customerId: request.customerId,
            vehicleId: request.vehicleId,
            items: [{ description: request.description, quantity: 1, price: 0 }]
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string, type: 'budget' | 'request') => {
        try {
            if (type === 'budget') {
                await deleteBudget(id);
                toast({ title: 'Éxito', description: 'Presupuesto eliminado.' });
            } else {
                await deleteBudgetRequest(id);
                toast({ title: 'Éxito', description: 'Solicitud eliminada.' });
            }
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        }
    };

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Tabs defaultValue="requests">
                <div className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Presupuestos y Solicitudes</CardTitle>
                        <CardDescription>Gestiona las cotizaciones y solicitudes de tus clientes.</CardDescription>
                    </div>
                    <Button onClick={handleCreateClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Presupuesto Manual
                    </Button>
                </div>

                <TabsList className="mt-4">
                    <TabsTrigger value="requests">
                        <FileText className="mr-2 h-4 w-4" />
                        Solicitudes Pendientes ({requests.length})
                    </TabsTrigger>
                    <TabsTrigger value="budgets">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Presupuestos Emitidos ({budgets.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Solicitudes de Clientes</CardTitle>
                            <CardDescription>Estas son las solicitudes pendientes que han enviado los clientes desde su portal.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vehículo</TableHead>
                                        <TableHead>Descripción de la Necesidad</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isPending ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell></TableRow>
                                    ) : requests.length > 0 ? (
                                        requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.customerName}</TableCell>
                                                <TableCell>{req.vehicleIdentifier}</TableCell>
                                                <TableCell className="max-w-xs truncate">{req.description}</TableCell>
                                                <TableCell>{format(parseISO(req.createdAt.toDate().toISOString()), 'P', { locale: es })}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleCreateFromRequest(req)}>
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                        Crear Presupuesto
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay solicitudes pendientes.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budgets" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Presupuestos</CardTitle>
                            <CardDescription>Todos los presupuestos que has generado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vehículo</TableHead>
                                        <TableHead className="text-right">Monto Total</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isPending ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell></TableRow>
                                    ) : budgets.length > 0 ? (
                                        budgets.map((budget) => (
                                            <TableRow key={budget.id}>
                                                <TableCell className="font-medium">{budget.customerName}</TableCell>
                                                <TableCell>{budget.vehicleIdentifier}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(budget.total)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={getStatusVariant(budget.status)}>{budget.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEditClick(budget)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(budget.id, 'budget')} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay presupuestos emitidos.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <BudgetFormDialog 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={() => {
                    setIsFormOpen(false);
                    loadData();
                }}
                isEditing={isEditing}
                budget={selectedBudget}
                initialData={prefillData}
            />
        </AuthGuard>
    );
}
