
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
import { PlusCircle, Edit, Trash2, MoreHorizontal, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getFlowsAction, createFlowAction, updateFlowAction, deleteFlowAction } from './actions';
import { FlowFormDialog, Flow } from './FlowFormDialog';

export default function WhatsappBotSettingsPage() {
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
    const [flowToDelete, setFlowToDelete] = useState<Flow | null>(null);

    const { toast } = useToast();

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const fetchedFlows = await getFlowsAction();
            setFlows(fetchedFlows);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los flujos.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlows();
    }, []);

    const handleOpenDialog = (flow: Flow | null = null) => {
        setSelectedFlow(flow);
        setDialogOpen(true);
    };

    const handleFormSubmit = async (data: Flow) => {
        startTransition(async () => {
            const action = data._id ? updateFlowAction : createFlowAction;
            const payload = data._id ? [data._id, data] : [data];
            
            // @ts-ignore - a TypeScript limitation with dynamic function calls
            const result = await action(...payload);

            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                setDialogOpen(false);
                fetchFlows();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleDeleteFlow = async () => {
        if (!flowToDelete) return;
        startTransition(async () => {
            const result = await deleteFlowAction(flowToDelete._id!);
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                setFlowToDelete(null);
                fetchFlows();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Bot /> Gestión de Flujos de WhatsApp</CardTitle>
                        <CardDescription>Crea y administra las respuestas automáticas de tu bot.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Flujo
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Flujo</TableHead>
                                <TableHead>Palabras Clave</TableHead>
                                <TableHead>Respuestas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : flows.length > 0 ? (
                                flows.map((flow) => (
                                    <TableRow key={flow._id}>
                                        <TableCell className="font-medium">{flow.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {flow.keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{flow.responses.length}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(flow)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setFlowToDelete(flow)} className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Aún no has creado ningún flujo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <FlowFormDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                initialData={selectedFlow}
            />

            <AlertDialog open={!!flowToDelete} onOpenChange={() => setFlowToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el flujo "{flowToDelete?.name}". No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFlow} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
