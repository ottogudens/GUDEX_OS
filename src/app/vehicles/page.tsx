
"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchAllVehicles, fetchCustomers } from '@/lib/data';
import { Vehicle, Customer } from '@/lib/types';
import type { VehicleFormData } from '@/lib/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { AddVehicleButton } from '@/components/AddVehicleButton';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateVehicle, deleteVehicle } from '@/lib/mutations';
import { VehicleSchema } from '@/lib/schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

type VehicleWithCustomer = Vehicle & { customerName: string };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithCustomer | null>(null);

  const [editFormData, setEditFormData] = useState<Partial<VehicleFormData>>({});
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehiclesData, customersData] = await Promise.all([
        fetchAllVehicles(),
        fetchCustomers()
      ]);
      setVehicles(vehiclesData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditDialog = (vehicle: VehicleWithCustomer) => {
    setSelectedVehicle(vehicle);
    setEditFormData({
      ...vehicle,
      year: vehicle.year,
    });
    setEditImagePreview(vehicle.imageUrl || null);
    setIsEditOpen(true);
  };
  
  const openDeleteDialog = (vehicle: VehicleWithCustomer) => {
      setSelectedVehicle(vehicle);
      setIsDeleteOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleEditSelectChange = (name: keyof VehicleFormData, value: string) => {
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const validatedFields = VehicleSchema.safeParse(editFormData);
    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
      toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessages });
      return;
    }

    startTransition(async () => {
      try {
        await updateVehicle(selectedVehicle.id, validatedFields.data, editImageFile);
        toast({ title: 'Éxito', description: 'Vehículo actualizado correctamente.' });
        setIsEditOpen(false);
        await loadData();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al actualizar', description: error.message });
      }
    });
  };

  const handleDelete = () => {
    if (!selectedVehicle) return;
    startTransition(async () => {
        try {
            await deleteVehicle(selectedVehicle.id);
            toast({ title: 'Éxito', description: 'Vehículo eliminado correctamente.' });
            setIsDeleteOpen(false);
            await loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        }
    });
  };

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vehículos</CardTitle>
            <CardDescription>Lista de todos los vehículos de clientes registrados.</CardDescription>
          </div>
           <AddVehicleButton onSuccess={loadData} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Patente</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>{vehicle.licensePlate}</TableCell>
                    <TableCell>{vehicle.customerName}</TableCell>
                    <TableCell className="font-mono text-xs">{vehicle.vin || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(vehicle)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDeleteDialog(vehicle)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No hay vehículos registrados.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Vehículo</DialogTitle>
            <DialogDescription>
              Modifica los datos del vehículo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="p-6 space-y-6">
                <div className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-medium">Datos Principales</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label htmlFor="customerId">Cliente *</Label>
                          <Select name="customerId" value={editFormData.customerId || ''} onValueChange={(val) => handleEditSelectChange('customerId', val)} required>
                              <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                              <SelectContent>
                                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="licensePlate">Patente *</Label>
                          <Input id="licensePlate" name="licensePlate" value={editFormData.licensePlate || ''} onChange={handleEditFormChange} required />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="make">Marca *</Label>
                          <Input id="make" name="make" value={editFormData.make || ''} onChange={handleEditFormChange} required />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="model">Modelo *</Label>
                          <Input id="model" name="model" value={editFormData.model || ''} onChange={handleEditFormChange} required />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="year">Año *</Label>
                          <Input id="year" name="year" type="number" value={editFormData.year || ''} onChange={handleEditFormChange} required />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="engineDisplacement">Cilindrada *</Label>
                          <Input id="engineDisplacement" name="engineDisplacement" value={editFormData.engineDisplacement || ''} onChange={handleEditFormChange} required />
                      </div>
                      <div className="grid gap-2">
                          <Label htmlFor="fuelType">Tipo de Combustible *</Label>
                          <Select name="fuelType" value={editFormData.fuelType || ''} onValueChange={(val) => handleEditSelectChange('fuelType', val)} required>
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
                          <Label htmlFor="transmissionType">Tipo de Transmisión *</Label>
                          <Select name="transmissionType" value={editFormData.transmissionType || ''} onValueChange={(val) => handleEditSelectChange('transmissionType', val)} required>
                              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Manual">Manual</SelectItem>
                                  <SelectItem value="Automática">Automática</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                   </div>
                </div>
                 <Accordion type="single" collapsible>
                    <AccordionItem value="optional-data">
                        <AccordionTrigger>Datos Opcionales</AccordionTrigger>
                        <AccordionContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                               <div className="md:col-span-2">
                                   <Label>Imagen</Label>
                                   <div className="flex items-center gap-4 mt-2">
                                     <div className="w-32 h-24 border rounded-md flex items-center justify-center bg-muted">
                                         {editImagePreview ? <Image src={editImagePreview} alt="Vista previa" width={128} height={96} className="object-cover w-full h-full rounded-md" /> : <Skeleton className="w-full h-full" />}
                                     </div>
                                     <Input type="file" name="image" accept="image/*" onChange={handleEditImageChange} className="max-w-xs" />
                                   </div>
                               </div>
                                <div className="grid gap-2"><Label htmlFor="vin">VIN</Label><Input id="vin" name="vin" value={editFormData.vin || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="engineNumber">N° Motor</Label><Input id="engineNumber" name="engineNumber" value={editFormData.engineNumber || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="color">Color</Label><Input id="color" name="color" value={editFormData.color || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="oilFilter">Filtro Aceite</Label><Input id="oilFilter" name="oilFilter" value={editFormData.oilFilter || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="airFilter">Filtro Aire</Label><Input id="airFilter" name="airFilter" value={editFormData.airFilter || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="fuelFilter">Filtro Combustible</Label><Input id="fuelFilter" name="fuelFilter" value={editFormData.fuelFilter || ''} onChange={handleEditFormChange} /></div>
                                <div className="grid gap-2"><Label htmlFor="pollenFilter">Filtro Polen</Label><Input id="pollenFilter" name="pollenFilter" value={editFormData.pollenFilter || ''} onChange={handleEditFormChange} /></div>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                 </Accordion>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el vehículo {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.licensePlate}) del sistema.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                    {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AuthGuard>
  );
}
