
"use client";

import { useState, useEffect, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Product, ProductCategory } from '@/lib/types';
import { ProductSchema, ProductFormData } from '@/lib/schemas';
import { createProduct, updateProduct } from '@/lib/mutations';
import { useToast } from '@/hooks/use-toast';
import { fetchProductCategories } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from './ui/scroll-area';

interface ProductFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isEditing: boolean;
  initialProductData: Partial<Product> | null;
  onSuccess: () => void;
}

export function ProductFormDialog({
  isOpen,
  onOpenChange,
  isEditing,
  initialProductData,
  onSuccess,
}: ProductFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
  });

  const selectedCategoryName = watch('category');

  const selectedCategory = useMemo(() => {
    return categories.find(c => c.name === selectedCategoryName);
  }, [categories, selectedCategoryName]);

  useEffect(() => {
    async function loadCategories() {
      const fetchedCategories = await fetchProductCategories();
      setCategories(fetchedCategories);
    }
    loadCategories();
  }, []);
  
  useEffect(() => {
    if (initialProductData) {
      reset(initialProductData);
    } else {
      reset({
        name: '',
        brand: '',
        salePrice: 0,
        purchasePrice: 0,
        stock: 0,
        barcode: '',
        category: '',
        subcategory: '',
        visibleInPOS: false,
      });
    }
  }, [initialProductData, reset]);

  const onSubmit = (data: ProductFormData) => {
    startTransition(async () => {
      try {
        if (isEditing && initialProductData?.id) {
          await updateProduct(initialProductData.id, data, null);
          toast({ title: 'Éxito', description: 'Producto actualizado.' });
        } else {
          await createProduct(data);
          toast({ title: 'Éxito', description: 'Producto creado.' });
        }
        onSuccess();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudo guardar el producto.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los detalles del producto.' : 'Completa el formulario para añadir un nuevo producto.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-4 py-4 px-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="brand">Marca</Label>
                            <Input id="brand" {...register('brand')} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                             {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="subcategory">Subcategoría</Label>
                            <Controller
                                name="subcategory"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona una subcategoría" /></SelectTrigger>
                                        <SelectContent>
                                            {selectedCategory?.subcategories?.map(sub => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="purchasePrice">Precio Compra</Label>
                            <Input id="purchasePrice" type="number" {...register('purchasePrice', { valueAsNumber: true })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="salePrice">Precio Venta</Label>
                            <Input id="salePrice" type="number" {...register('salePrice', { valueAsNumber: true })} />
                            {errors.salePrice && <p className="text-red-500 text-xs">{errors.salePrice.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="stock">Stock</Label>
                            <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} />
                            {errors.stock && <p className="text-red-500 text-xs">{errors.stock.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="barcode">Código de Barras</Label>
                            <Input id="barcode" {...register('barcode')} />
                        </div>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Controller
                            name="visibleInPOS"
                            control={control}
                            render={({ field }) => (
                                <Switch id="visibleInPOS" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                        <Label htmlFor="visibleInPOS">Visible en Punto de Venta (POS)</Label>
                    </div>
                </div>
            </ScrollArea>
             <DialogFooter className="pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
