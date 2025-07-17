
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BudgetSchema, type Budget } from '@/lib/budget-schema';
import type { Customer, Vehicle } from '@/lib/types';
import { fetchCustomers, fetchVehiclesByCustomer } from '@/lib/data';
import { createBudget, updateBudget } from '@/lib/mutations';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';

type BudgetFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isEditing: boolean;
  budget?: Budget;
};

const formSchema = BudgetSchema.omit({ 
    id: true, 
    createdAt: true, 
    createdByName: true, 
    createdById: true,
    total: true, // Total is calculated
});

type BudgetFormData = z.infer<typeof formSchema>;

export function BudgetFormDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  isEditing,
  budget,
}: BudgetFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && budget
      ? {
          customerId: budget.customerId,
          vehicleId: budget.vehicleId,
          status: budget.status,
          items: budget.items,
        }
      : {
          customerId: '',
          vehicleId: '',
          status: 'Pendiente',
          items: [{ description: '', quantity: 1, price: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedCustomerId = form.watch('customerId');
  
  useEffect(() => {
    async function loadCustomers() {
      const fetchedCustomers = await fetchCustomers();
      setCustomers(fetchedCustomers);
    }
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);
  
  useEffect(() => {
    async function loadVehicles(customerId: string) {
      setIsLoadingVehicles(true);
      try {
        const fetchedVehicles = await fetchVehiclesByCustomer(customerId);
        setVehicles(fetchedVehicles);
        // Reset vehicleId if the previously selected one is not in the new list
        if (!fetchedVehicles.some(v => v.id === form.getValues('vehicleId'))) {
             form.setValue('vehicleId', '');
        }
      } catch (error) {
        console.error("Failed to load vehicles", error);
        setVehicles([]);
      } finally {
        setIsLoadingVehicles(false);
      }
    }

    if (selectedCustomerId) {
      loadVehicles(selectedCustomerId);
    } else {
      setVehicles([]);
    }
  }, [selectedCustomerId, form]);


  useEffect(() => {
    if (isEditing && budget) {
      form.reset({
        customerId: budget.customerId,
        vehicleId: budget.vehicleId,
        status: budget.status,
        items: budget.items,
      });
    } else if (!isEditing) {
       form.reset({
          customerId: '',
          vehicleId: '',
          status: 'Pendiente',
          items: [{ description: '', quantity: 1, price: 0 }],
      });
    }
  }, [isEditing, budget, form, isOpen]);


  const calculateTotal = () => {
    return form.getValues('items').reduce((acc, item) => acc + (item.quantity * item.price), 0);
  };

  const onSubmit = (data: BudgetFormData) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes estar autenticado.' });
        return;
    }
    
    startTransition(async () => {
      try {
        const total = data.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const budgetData = { 
            ...data, 
            total,
            createdById: user.id,
            createdByName: user.name,
        };

        if (isEditing && budget) {
          await updateBudget(budget.id, budgetData);
          toast({ title: 'Éxito', description: 'Presupuesto actualizado correctamente.' });
        } else {
          await createBudget(budgetData);
          toast({ title: 'Éxito', description: 'Presupuesto creado correctamente.' });
        }
        
        onSuccess();
        onOpenChange(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Presupuesto' : 'Crear Presupuesto'}</DialogTitle>
          <DialogDescription>
            Completa los detalles de la cotización.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingVehicles || vehicles.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingVehicles ? "Cargando..." : "Selecciona un vehículo"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ítems del Presupuesto</h3>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Cambio de aceite y filtro" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem style={{ flexBasis: '100px' }}>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field }) => (
                        <FormItem style={{ flexBasis: '150px' }}>
                          <FormLabel>Precio Unit.</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', quantity: 1, price: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Ítem
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="Aprobado">Aprobado</SelectItem>
                            <SelectItem value="Rechazado">Rechazado</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="md:col-span-2 flex justify-end items-end">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Presupuesto</p>
                        <p className="text-2xl font-bold">{formatCurrency(calculateTotal())}</p>
                    </div>
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Presupuesto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
