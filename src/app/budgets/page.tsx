
"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, FileText, Sparkles, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import type { Budget, BudgetRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { BudgetFormDialog } from '@/components/BudgetFormDialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchBudgetsAction, fetchBudgetRequestsAction, deleteBudgetAction, deleteBudgetRequestAction, EnrichedBudget } from './actions';
import { useSettings } from '@/context/SettingsContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function BudgetsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { settings } = useSettings();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
    const [prefillData, setPrefillData] = useState<Partial<Budget> | undefined>(undefined);

    const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery({
        queryKey: ['budgets'],
        queryFn: fetchBudgetsAction,
    });
    
    const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
        queryKey: ['budget-requests'],
        queryFn: fetchBudgetRequestsAction,
    });
    
    const deleteMutation = useMutation({
        mutationFn: (vars: { id: string, type: 'budget' | 'request' }) => 
            vars.type === 'budget' ? deleteBudgetAction(vars.id) : deleteBudgetRequestAction(vars.id),
        onSuccess: (result) => {
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                queryClient.invalidateQueries({ queryKey: ['budgets'] });
                queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        },
        onError: (error) => toast({ variant: 'destructive', title: 'Error Inesperado', description: error.message }),
    });

    const generateBudgetPDF = (budget: EnrichedBudget) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text(settings?.name || 'Presupuesto', 105, 22, { align: 'center' });
        doc.setFontSize(10);
        if(settings?.address) doc.text(settings.address, 105, 30, { align: 'center' });
        if(settings?.phone) doc.text(`Teléfono: ${settings.phone}`, 105, 36, { align: 'center' });
        
        // Client Info
        doc.setFontSize(12);
        doc.text('Presupuesto Para:', 14, 50);
        doc.setFontSize(10);
        doc.text(budget.customerName, 14, 56);
        doc.text(`Vehículo: ${budget.vehicleIdentifier}`, 14, 62);

        doc.setFontSize(12);
        doc.text(`Nº Presupuesto: #${budget.id.slice(0, 7).toUpperCase()}`, 200, 50, { align: 'right' });
        doc.text(`Fecha: ${format(budget.createdAt.toDate(), 'dd/MM/yyyy')}`, 200, 56, { align: 'right' });
        
        // Table with items
        const body = budget.items.map(item => [
            item.description,
            item.quantity.toString(),
            formatCurrency(item.price),
            formatCurrency(item.price * item.quantity),
        ]);
        
        doc.autoTable({
            startY: 75,
            head: [['Descripción', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Total
        const finalY = doc.autoTable.previous.finalY;
        doc.setFontSize(14);
        doc.text('Total:', 150, finalY + 15, { align: 'right' });
        doc.text(formatCurrency(budget.total), 200, finalY + 15, { align: 'right' });

        doc.save(`Presupuesto-${budget.id.slice(0, 7)}.pdf`);
    };

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

    const handleDelete = (id: string, type: 'budget' | 'request') => {
        deleteMutation.mutate({ id, type });
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
                        <CardHeader><CardTitle>Solicitudes de Clientes</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Vehículo</TableHead><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoadingRequests ? <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell></TableRow>
                                    : requests.length > 0 ? requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.customerName}</TableCell>
                                            <TableCell>{req.vehicleIdentifier}</TableCell>
                                            <TableCell className="max-w-xs truncate">{req.description}</TableCell>
                                            <TableCell>{format(req.createdAt.toDate(), 'P', { locale: es })}</TableCell>
                                            <TableCell className="text-right"><Button size="sm" onClick={() => handleCreateFromRequest(req)}><Sparkles className="mr-2 h-4 w-4" />Crear Presupuesto</Button></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay solicitudes pendientes.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budgets" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Historial de Presupuestos</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Vehículo</TableHead><TableHead className="text-right">Monto Total</TableHead><TableHead className="text-center">Estado</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoadingBudgets ? <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell></TableRow>
                                    : budgets.length > 0 ? budgets.map((budget) => (
                                        <TableRow key={budget.id}>
                                            <TableCell className="font-medium">{budget.customerName}</TableCell>
                                            <TableCell>{budget.vehicleIdentifier}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(budget.total)}</TableCell>
                                            <TableCell className="text-center"><Badge variant={getStatusVariant(budget.status)}>{budget.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => generateBudgetPDF(budget)}><Download className="mr-2 h-4 w-4" />Descargar PDF</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditClick(budget)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(budget.id, 'budget')} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay presupuestos emitidos.</TableCell></TableRow>}
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
                    queryClient.invalidateQueries({ queryKey: ['budgets'] });
                }}
                isEditing={isEditing}
                budget={selectedBudget}
                initialData={prefillData}
            />
        </AuthGuard>
    );
}
