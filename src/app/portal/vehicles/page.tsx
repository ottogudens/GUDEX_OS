"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button'; // Keep this line
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Add these imports
import { VehicleSchema } from '@/lib/schemas';
import type { Vehicle, VehicleFormData } from '@/lib/types';
import Image from 'next/image';

export default function ClientVehiclesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [initialLoading, setInitialLoading] = useState(true); // Use a separate state for initial load
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [addFormData, setAddFormData] = useState<Partial<VehicleFormData>>({});
    const [addImageFile, setAddImageFile] = useState<File | null>(null);
    const [addImagePreview, setAddImagePreview] = useState<string | null>(null);

    const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Moved state declaration here
    useEffect(() => {
        if (!user?.id) {
            setInitialLoading(false);
            setLoading(false);
            setVehicles([]);
            return;
        }

        // Set up real-time listener
        setInitialLoading(true); // Start initial loading state
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('customerId', '==', user.id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const vehiclesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Vehicle[];
            setVehicles(vehiclesData);
            setLoading(false); // Data is loaded, stop the general loading indicator 
            setInitialLoading(false); // Initial load complete
        }, (error) => {
            console.error("Error listening to vehicles:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al sincronizar tus vehículos.' });
            setLoading(false);
            setInitialLoading(false);
        });

        // Clean up the listener on component unmount
        return () => unsubscribe();
    }, [user, toast]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setAddFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || '' : value }));
    };

    const handleSelectChange = (name: keyof VehicleFormData, value: string) => {
        setAddFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAddImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAddImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const resetForm = () => {
        setAddFormData({});
        setAddImageFile(null);
        setAddImagePreview(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        const dataToValidate = {
            ...addFormData,
            customerId: user.id,
        };
        
        const validatedFields = VehicleSchema.safeParse(dataToValidate);

        if (!validatedFields.success) {
            const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
            toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessages });
            return;
        }

        startTransition(async () => {
            try {
                await createVehicle(validatedFields.data, addImageFile);
                toast({ title: '¡Éxito!', description: 'Tu vehículo ha sido añadido correctamente.' });
                setIsAddDialogOpen(false);
                resetForm();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error al añadir vehículo', description: error.message });
            }
        });
    };
    
    return (
        <AuthGuard allowedRoles={['Cliente']}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Mis Vehículos</h1>
                        <p className="text-muted-foreground">Gestiona los vehículos asociados a tu cuenta.</p>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Vehículo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Añadir Nuevo Vehículo</DialogTitle>
                            <DialogDescription>
                              Completa los datos de tu vehículo. Los campos marcados con * son obligatorios.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleSubmit}>
                            <ScrollArea className="max-h-[70vh] p-1">
                                <div className="p-4 space-y-4">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="licensePlate">Patente *</Label>
                                            <Input id="licensePlate" name="licensePlate" value={addFormData.licensePlate || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="year">Año *</Label>
                                            <Input id="year" name="year" type="number" value={addFormData.year || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="make">Marca *</Label>
                                            <Input id="make" name="make" value={addFormData.make || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="model">Modelo *</Label>
                                            <Input id="model" name="model" value={addFormData.model || ''} onChange={handleFormChange} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="engineDisplacement">Cilindrada *</Label>
                                            <Input id="engineDisplacement" name="engineDisplacement" value={addFormData.engineDisplacement || ''} onChange={handleFormChange} required />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label htmlFor="fuelType">Combustible *</Label>
                                            <Select name="fuelType" value={addFormData.fuelType} onValueChange={(val) => handleSelectChange('fuelType', val)} required>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Gasolina">Gasolina</SelectItem>
                                                    <SelectItem value="Diésel">Diésel</SelectItem>
                                                    <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                                                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                                                    <SelectItem value="Otro">Otro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="transmissionType">Transmisión *</Label>
                                            <Select name="transmissionType" value={addFormData.transmissionType} onValueChange={(val) => handleSelectChange('transmissionType', val)} required>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Manual">Manual</SelectItem>
                                                    <SelectItem value="Automática">Automática</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="vin">VIN (Opcional)</Label>
                                            <Input id="vin" name="vin" value={addFormData.vin || ''} onChange={handleFormChange} />
                                        </div>
                                     </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="pt-6 border-t mt-4">
                                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Vehículo'}</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                </div>
                
                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : vehicles.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {vehicles.map(vehicle => (
                            <Card key={vehicle.id}>
                                <CardHeader>
                                    <CardTitle>{vehicle.year} {vehicle.make} {vehicle.model}</CardTitle>
                                    <CardDescription>Patente: {vehicle.licensePlate}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm"><strong>VIN:</strong> {vehicle.vin || 'No especificado'}</p>
                                    <p className="text-sm"><strong>Combustible:</strong> {vehicle.fuelType}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
                        <Car className="w-12 h-12 text-muted-foreground" />
                        <h2 className="mt-4 text-xl font-semibold">Sin Vehículos Registrados</h2>
                        <p className="mt-2 text-muted-foreground">Aún no has añadido ningún vehículo. Haz clic en "Añadir Vehículo" para empezar.</p>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
