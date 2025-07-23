
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Customer } from '@/lib/types';
import { updateCustomer } from '@/lib/mutations';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

const customerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  email: z.string().email('Email inválido.'),
  phone: z.string().min(1, 'El teléfono es obligatorio.'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface EditCustomerButtonProps {
  customer: Customer;
  onSuccess: () => void;
}

export function EditCustomerButton({ customer, onSuccess }: EditCustomerButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    startTransition(async () => {
      const result = await updateCustomer(customer.id, data);
      if (result.success) {
        toast({ title: 'Éxito', description: 'Cliente actualizado correctamente.' });
        onSuccess();
        setOpen(false);
        reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'No se pudo actualizar el cliente.',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Editar</span>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Realiza cambios en el perfil del cliente. Haz clic en guardar cuando hayas terminado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" {...register('name')} className="col-span-3" />
            {errors.name && <p className="col-span-4 text-red-500 text-xs text-right">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" {...register('email')} className="col-span-3" />
            {errors.email && <p className="col-span-4 text-red-500 text-xs text-right">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input id="phone" {...register('phone')} className="col-span-3" />
             {errors.phone && <p className="col-span-4 text-red-500 text-xs text-right">{errors.phone.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
