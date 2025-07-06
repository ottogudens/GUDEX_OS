
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { createCustomer } from '@/lib/mutations';
import { CustomerSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Customer } from '@/lib/types';

interface AddCustomerButtonProps {
  onSuccess?: (newCustomer: Pick<Customer, 'id' | 'name'>) => void;
}

export function AddCustomerButton({ onSuccess }: AddCustomerButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
    };
    
    const validatedFields = CustomerSchema.safeParse(data);

    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ');
      toast({
        variant: 'destructive',
        title: 'Error de Validación',
        description: errorMessages,
      });
      return;
    }

    startTransition(async () => {
      try {
        const newCustomer = await createCustomer(validatedFields.data);
        toast({
          title: 'Éxito',
          description: 'Cliente añadido correctamente.',
        });
        setOpen(false);
        if (onSuccess) {
          onSuccess(newCustomer);
        } else {
          router.refresh();
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al crear cliente',
          description: error.message || 'No se pudo crear el cliente. Por favor, inténtelo de nuevo.',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Completa el formulario para añadir un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input id="name" name="name" placeholder="ej. María Rodriguez" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="ej. maria.r@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" type="tel" placeholder="ej. 555-0199" required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
