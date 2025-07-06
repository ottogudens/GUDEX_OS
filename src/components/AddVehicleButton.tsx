
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { AddCustomerButton } from './AddCustomerButton';
import { createVehicle } from '@/lib/mutations';
import { VehicleSchema } from '@/lib/schemas';
import { fetchCustomers } from '@/lib/data';
import type { Customer } from '@/lib/types';


export function AddVehicleButton({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Pick<Customer, 'id' | 'name'>[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');
  const [selectedTransmissionType, setSelectedTransmissionType] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadCustomers = async () => {
    const data = await fetchCustomers();
    setCustomers(data.map(c => ({ id: c.id, name: c.name })));
  }

  useEffect(() => {
    if (open) {
      loadCustomers();
      // Reset form state on open
      setSelectedCustomerId('');
      setSelectedFuelType('');
      setSelectedTransmissionType('');
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open]);

  const handleCustomerCreated = (newCustomer: Pick<Customer, 'id' | 'name'>) => {
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomerId(newCustomer.id);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customerId: selectedCustomerId,
      licensePlate: formData.get('licensePlate'),
      make: formData.get('make'),
      model: formData.get('model'),
      year: formData.get('year'),
      engineDisplacement: formData.get('engineDisplacement'),
      fuelType: selectedFuelType,
      transmissionType: selectedTransmissionType,
      engineNumber: formData.get('engineNumber') || '',
      vin: formData.get('vin') || '',
      color: formData.get('color') || '',
      oilFilter: formData.get('oilFilter') || '',
      airFilter: formData.get('airFilter') || '',
      fuelFilter: formData.get('fuelFilter') || '',
      pollenFilter: formData.get('pollenFilter') || '',
    };
    
    const validatedFields = VehicleSchema.safeParse(data);

    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
      toast({
        variant: 'destructive',
        title: 'Error de Validación',
        description: errorMessages,
      });
      return;
    }

    startTransition(async () => {
      try {
        await createVehicle(validatedFields.data, imageFile);
        toast({
          title: 'Éxito',
          description: 'Vehículo añadido correctamente.',
        });
        setOpen(false);
        onSuccess();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al crear vehículo',
          description: error.message || 'No se pudo añadir el vehículo. Inténtalo de nuevo.',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Vehículo</DialogTitle>
          <DialogDescription>
            Completa los datos del vehículo. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="p-6 space-y-6">
              
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium">Datos Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customerId">Cliente *</Label>
                    <div className="flex items-center gap-2">
                       <Select name="customerId" value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <AddCustomerButton onSuccess={handleCustomerCreated} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="licensePlate">Patente *</Label>
                    <Input id="licensePlate" name="licensePlate" placeholder="ej. ABCD-12" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="make">Marca *</Label>
                    <Input id="make" name="make" placeholder="ej. Toyota" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">Modelo *</Label>
                    <Input id="model" name="model" placeholder="ej. Yaris" required />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="year">Año *</Label>
                    <Input id="year" name="year" type="number" placeholder="ej. 2022" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="engineDisplacement">Cilindrada *</Label>
                    <Input id="engineDisplacement" name="engineDisplacement" placeholder="ej. 1.5L" required />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="fuelType">Tipo de Combustible *</Label>
                     <Select name="fuelType" required value={selectedFuelType} onValueChange={setSelectedFuelType}>
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
                     <Select name="transmissionType" required value={selectedTransmissionType} onValueChange={setSelectedTransmissionType}>
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
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Imagen del Vehículo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-24 border rounded-md flex items-center justify-center bg-muted">
                            {imagePreview ? <Image src={imagePreview} alt="Vista previa" width={128} height={96} className="object-cover w-full h-full rounded-md" /> : <Car className="w-10 h-10 text-muted-foreground" />}
                          </div>
                          <Input type="file" name="image" accept="image/*" onChange={handleImageChange} className="max-w-xs" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="vin">Número VIN</Label>
                        <Input id="vin" name="vin" placeholder="ej. 9BW..."/>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="engineNumber">Número de Motor</Label>
                        <Input id="engineNumber" name="engineNumber" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" name="color" placeholder="ej. Rojo Metálico" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="oilFilter">Filtro de Aceite (código)</Label>
                        <Input id="oilFilter" name="oilFilter" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="airFilter">Filtro de Aire (código)</Label>
                        <Input id="airFilter" name="airFilter" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fuelFilter">Filtro de Combustible (código)</Label>
                        <Input id="fuelFilter" name="fuelFilter" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pollenFilter">Filtro de Polen (código)</Label>
                        <Input id="pollenFilter" name="pollenFilter" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            </div>
          </ScrollArea>
          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Vehículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
