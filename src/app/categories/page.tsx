
"use client";

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Check, X, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { ServiceCategory } from '@/lib/types';
import { fetchServiceCategories as fetchCategories } from '@/lib/data';
import { 
    createServiceCategory, 
    updateServiceCategory, 
    deleteServiceCategory, 
} from '@/lib/mutations';
import { ServiceCategorySchema } from '@/lib/schemas';

type DialogState = {
  isOpen: boolean;
  isEditing: boolean;
  category: Partial<ServiceCategory> | null;
  parentId?: string | null;
  isSubcategory: boolean;
};

const initialDialogState: DialogState = {
  isOpen: false,
  isEditing: false,
  category: null,
  parentId: null,
  isSubcategory: false,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const { toast } = useToast();

  const loadCategories = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las categorías.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openDialog = (state: Partial<DialogState>) => {
    setDialogState({ ...initialDialogState, isOpen: true, ...state });
  };
  
  const closeDialog = () => setDialogState(initialDialogState);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToValidate = {
      name: dialogState.category?.name,
      availableInPOS: dialogState.category?.availableInPOS,
      parentId: dialogState.parentId,
    };
    
    const validatedFields = ServiceCategorySchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
        return;
    }

    startTransition(async () => {
        try {
            if (dialogState.isEditing && dialogState.category?.id) {
                await updateServiceCategory(dialogState.category.id, validatedFields.data);
                toast({ title: 'Éxito', description: 'Categoría actualizada correctamente.' });
            } else {
                await createServiceCategory(validatedFields.data);
                toast({ title: 'Éxito', description: 'Categoría creada correctamente.' });
            }
            await loadCategories();
            closeDialog();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar la categoría.' });
        }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
        try {
            await deleteServiceCategory(id);
            toast({ title: 'Éxito', description: 'Categoría eliminada correctamente.' });
            await loadCategories();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar la categoría.' });
        }
    });
  }

  const CategoryRow = ({ category, isSubcategory = false }: { category: ServiceCategory; isSubcategory?: boolean }) => (
    <TableRow>
      <TableCell className={`font-medium ${isSubcategory ? 'pl-10' : ''}`}>
        {category.name}
      </TableCell>
      <TableCell className="text-center">
        {isSubcategory ? 'N/A' : (
            category.availableInPOS ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-destructive mx-auto" />
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
            {!isSubcategory && (
                <Button variant="outline" size="sm" onClick={() => openDialog({ isSubcategory: true, parentId: category.id, category: { name: '', availableInPOS: true }})}>
                    <Plus className="mr-1 h-4 w-4" /> Subcategoría
                </Button>
            )}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDialog({ isEditing: true, category, isSubcategory, parentId: category.parentId })}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría "{category.name}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-destructive hover:bg-destructive/90">
                                Sí, eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Categorías</CardTitle>
            <CardDescription>
              Crea y organiza las categorías y subcategorías de tus servicios.
            </CardDescription>
          </div>
          <Button onClick={() => openDialog({ category: { name: '', availableInPOS: true } })}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Categoría
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center w-[150px]">Visible en POS</TableHead>
                <TableHead className="text-right w-[250px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <React.Fragment key={category.id}>
                    <CategoryRow category={category} />
                    {category.subcategories?.map(sub => <CategoryRow key={sub.id} category={sub} isSubcategory />)}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No hay categorías creadas.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogState.isOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {dialogState.isEditing ? 'Editar' : 'Crear'} {dialogState.isSubcategory ? 'Subcategoría' : 'Categoría'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input 
                    id="name" 
                    value={dialogState.category?.name || ''} 
                    onChange={(e) => setDialogState(p => ({...p, category: {...p.category, name: e.target.value}}))} 
                    required 
                />
              </div>
              {!dialogState.isSubcategory && (
                 <div className="flex items-center space-x-2">
                    <Switch 
                        id="availableInPOS" 
                        checked={dialogState.category?.availableInPOS} 
                        onCheckedChange={(checked) => setDialogState(p => ({...p, category: {...p.category, availableInPOS: checked}}))}
                    />
                    <Label htmlFor="availableInPOS">Visible en Punto de Venta (POS)</Label>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
