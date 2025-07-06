"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';

import type { Provider } from '@/lib/types';
import { ProviderSchema, type ProviderFormData } from '@/lib/schemas';
import { fetchProviders } from '@/lib/data';
import { createProvider, updateProvider, deleteProvider } from '@/lib/mutations';

const initialProviderState: ProviderFormData = {
    name: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    bank: '',
    accountNumber: '',
    paymentTerms: '',
    discounts: '',
    representativeName: '',
    representativeEmail: '',
    representativePhone: '',
};

export default function ProvidersPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<Partial<Provider>>(initialProviderState);
    const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

    const loadProviders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchProviders();
            setProviders(data);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los proveedores.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    const openDialogForNew = () => {
        setIsEditing(false);
        setCurrentProvider(initialProviderState);
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (provider: Provider) => {
        setIsEditing(true);
        setCurrentProvider(provider);
        setIsDialogOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setCurrentProvider(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validatedFields = ProviderSchema.safeParse(currentProvider);

        if (!validatedFields.success) {
            toast({ variant: 'destructive', title: 'Error de Validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ') });
            return;
        }

        startTransition(async () => {
            try {
                if (isEditing && currentProvider.id) {
                    await updateProvider(currentProvider.id, validatedFields.data);
                    toast({ title: 'Éxito', description: 'Proveedor actualizado correctamente.' });
                } else {
                    await createProvider(validatedFields.data);
                    toast({ title: 'Éxito', description: 'Proveedor creado correctamente.' });
                }
                setIsDialogOpen(false);
                await loadProviders();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar el proveedor.' });
            }
        });
    };

    const handleDelete = () => {
        if (!providerToDelete) return;

        startTransition(async () => {
            try {
                await deleteProvider(providerToDelete.id);
                toast({ title: 'Éxito', description: 'Proveedor eliminado correctamente.' });
                setProviderToDelete(null);
                await loadProviders();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el proveedor.' });
            }
        });
    };

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestión de Proveedores</CardTitle>
                        <CardDescription>Administra la base de datos de tus proveedores.</CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Proveedor
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre / Razón Social</TableHead>
                                <TableHead>RUT / ID</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : providers.length > 0 ? (
                                providers.map((provider) => (
                                    <TableRow key={provider.id}>
                                        <TableCell className="font-medium">{provider.name}</TableCell>
                                        <TableCell>{provider.taxId}</TableCell>
                                        <TableCell>
                                            <div>{provider.phone}</div>
                                            <div className="text-xs text-muted-foreground">{provider.email}</div>
                                            {provider.representativeName && (
                                                <div className="mt-2 pt-2 border-t border-dashed">
                                                    <div className="text-xs font-semibold">Rep: {provider.representativeName}</div>
                                                    <div className="text-xs text-muted-foreground">{provider.representativePhone}</div>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openDialogForEdit(provider)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setProviderToDelete(provider)} className="text-destructive focus:text-destructive">
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
                                        No hay proveedores creados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Proveedor' : 'Crear Nuevo Proveedor'}</DialogTitle>
                        <DialogDescription>Completa la información del proveedor.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <ScrollArea className="max-h-[70vh] p-1">
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b pb-2">Identificación</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Nombre o Razón Social</Label>
                                            <Input id="name" value={currentProvider.name || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="taxId">RUT / ID Fiscal</Label>
                                            <Input id="taxId" value={currentProvider.taxId || ''} onChange={handleFormChange} required />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b pb-2">Contacto Principal</h3>
                                    <div className="grid gap-2">
                                        <Label htmlFor="address">Dirección</Label>
                                        <Input id="address" value={currentProvider.address || ''} onChange={handleFormChange} required />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Teléfono</Label>
                                            <Input id="phone" type="tel" value={currentProvider.phone || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Correo Electrónico</Label>
                                            <Input id="email" type="email" value={currentProvider.email || ''} onChange={handleFormChange} required />
                                        </div>
                                    </div>
                                </div>
                                 <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b pb-2">Contacto del Representante (Opcional)</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="representativeName">Nombre del Representante</Label>
                                            <Input id="representativeName" value={currentProvider.representativeName || ''} onChange={handleFormChange} />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label htmlFor="representativePhone">Teléfono del Representante</Label>
                                            <Input id="representativePhone" type="tel" value={currentProvider.representativePhone || ''} onChange={handleFormChange} />
                                        </div>
                                         <div className="grid md:col-span-2 gap-2">
                                            <Label htmlFor="representativeEmail">Correo del Representante</Label>
                                            <Input id="representativeEmail" type="email" value={currentProvider.representativeEmail || ''} onChange={handleFormChange} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b pb-2">Información Bancaria</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="bank">Banco</Label>
                                            <Input id="bank" value={currentProvider.bank || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="accountNumber">Número de Cuenta</Label>
                                            <Input id="accountNumber" value={currentProvider.accountNumber || ''} onChange={handleFormChange} required />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg border-b pb-2">Condiciones Comerciales</h3>
                                     <div className="grid gap-2">
                                        <Label htmlFor="paymentTerms">Plazos de Pago</Label>
                                        <Input id="paymentTerms" value={currentProvider.paymentTerms || ''} onChange={handleFormChange} required placeholder="Ej: 30 días, Contado" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="discounts">Descuentos (Opcional)</Label>
                                        <Textarea id="discounts" value={currentProvider.discounts || ''} onChange={handleFormChange} placeholder="Ej: 5% por pronto pago" />
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-6 border-t mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Proveedor'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!providerToDelete} onOpenChange={() => setProviderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente al proveedor "{providerToDelete?.name}" del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                            {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </AuthGuard>
    );
}
