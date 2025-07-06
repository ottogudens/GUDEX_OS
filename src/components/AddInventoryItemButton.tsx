
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
import { useToast } from '@/hooks/use-toast';
import { createInventoryItem, InventoryItemSchema } from '@/lib/mutations';
import { useRouter } from 'next/navigation';

export function AddInventoryItemButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      sku: formData.get('sku'),
      stock: formData.get('stock'),
      minStock: formData.get('minStock'),
      price: formData.get('price'),
    };
    
    const validatedFields = InventoryItemSchema.safeParse(data);
    
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
        await createInventoryItem(validatedFields.data);
        toast({
          title: 'Éxito',
          description: 'Artículo añadido al inventario correctamente.',
        });
        setOpen(false);
        router.refresh();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al crear artículo',
          description: error.message || 'No se pudo añadir el artículo. Inténtalo de nuevo.',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Artículo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription>
            Completa el formulario para registrar un nuevo artículo en el inventario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Artículo</Label>
              <Input id="name" name="name" placeholder="ej. Batería 12V" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" placeholder="ej. BAT-12V-STD" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock Actual</Label>
                <Input id="stock" name="stock" type="number" defaultValue={0} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">Stock Mínimo</Label>
                <Input id="minStock" name="minStock" type="number" defaultValue={10} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Precio (CLP)</Label>
              <Input id="price" name="price" type="number" step="1" placeholder="ej. 99990" required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Artículo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
