
"use client";

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MessageSquare, FileText, PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { fetchVehiclesByCustomerId, fetchServices, fetchProducts } from '@/lib/data';
import { createBudgetRequest } from '@/lib/mutations'; // Assuming you will create this mutation function
import type { Vehicle, Service, Product } from '@/lib/types';
import { useTransition } from 'react';


type Budget = {
    id: string;
    service: string;
    total: number;
    status: 'Esperando Aprobación' | 'Aprobado' | 'Rechazado';
    createdAt: string; // Use createdAt instead of date
    vehicleId: string;
    requestedItemId?: string; // Optional if custom description is used
    requestedItemType?: 'service' | 'product'; // Optional
    description?: string; // For manual description
};

export default function ClientBudgetsPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const { toast } = useToast();
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

    const { user } = useAuth();
    const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
    const [availableItems, setAvailableItems] = useState<(Service | Product)[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [requestFormData, setRequestFormData] = useState({ vehicleId: '', requestedItem: '', description: '' });

    const handleApprove = (id: string) => {
        setBudgets(prev => prev.map(b => b.id === id ? { ...b, status: 'Aprobado' } : b));
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Aprobado':
                return 'secondary';
            case 'Esperando Aprobación':
                return 'default';
            case 'Rechazado':
                return 'destructive';
            default:
                return 'outline';
        }
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    }
    
    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically handle form submission, e.g., send data to your backend.
        toast({
            title: "Solicitud Enviada",
            description: "Hemos recibido tu solicitud de presupuesto. Nos pondremos en contacto pronto.",
        });
        setIsRequestDialogOpen(false); // Close the dialog
    };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Mis Presupuestos</h1>
                    <p className="text-muted-foreground">Revisa, aprueba o consulta sobre los presupuestos de tus servicios.</p>
                </div>
                 <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Solicitar Presupuesto
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Solicitar Nuevo Presupuesto</DialogTitle>
                            <DialogDescription>
                                Describe el servicio que necesitas y te enviaremos una cotización.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRequestSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="vehicle">Vehículo</Label>
                                    <Select>
                                        <SelectTrigger id="vehicle">
                                            <SelectValue placeholder="Selecciona tu vehículo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No tienes vehículos</SelectItem>
                                            {/* Real vehicle data would be mapped here */}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="service">Servicio Deseado</Label>
                                    <Select>
                                        <SelectTrigger id="service">
                                            <SelectValue placeholder="Selecciona un servicio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cambio-aceite">Cambio de Aceite</SelectItem>
                                            <SelectItem value="revision-frenos">Revisión de Frenos</SelectItem>
                                            <SelectItem value="diagnostico">Diagnóstico General</SelectItem>
                                            <SelectItem value="otro">Otro (describir abajo)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Descripción del Problema o Necesidad</Label>
                                    <Textarea id="notes" placeholder="Ej: El auto hace un ruido extraño al frenar..." />
                                </div>
                                <Button type="submit" className="w-full">Enviar Solicitud</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            {budgets.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {budgets.map((budget) => (
                        <Card key={budget.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{budget.service}</CardTitle>
                                    <Badge variant={getStatusVariant(budget.status)}>{budget.status}</Badge>
                                </div>
                                <CardDescription>
                                    #{budget.id} &bull; Fecha: {budget.date}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-3xl font-bold">{formatCurrency(budget.total)}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="ghost">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Consultar
                                </Button>
                                {budget.status === 'Esperando Aprobación' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Confirmas la aprobación?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se aprobará el presupuesto para "{budget.service}" por un total de {formatCurrency(budget.total)}. Un asesor se pondrá en contacto para coordinar el servicio.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleApprove(budget.id)}>Confirmar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Sin Presupuestos</h2>
                    <p className="mt-2 text-muted-foreground">Aún no tienes presupuestos generados. Cuando solicites uno, aparecerá aquí.</p>
                </div>
            )}
        </div>
    </AuthGuard>
  );
}
