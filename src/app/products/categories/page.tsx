
"use client";

import * as React from 'react';
import { useMemo, useState, useTransition, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormState } from 'react-dom';
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Plus, Check, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { ProductCategory } from '@/lib/types';
import { fetchProductCategories } from '@/lib/data';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from './actions';

type DialogState = {
  isOpen: boolean;
  isEditing: boolean;
  category: Partial<ProductCategory> | null;
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

const initialFormState = { type: '', message: '', errors: null };

export default function ProductCategoriesPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  const [formState, formAction] = useFormState(
    dialogState.isEditing ? updateCategoryAction : createCategoryAction,
    initialFormState
  );

  const { data: categories = [], isLoading, isError, refetch } = useQuery<ProductCategory[]>({
    queryKey: ['productCategories'],
    queryFn: fetchProductCategories,
  });

  useEffect(() => {
    if (formState.type === 'success') {
      toast({ title: 'Éxito', description: formState.message });
      closeDialog();
    } else if (formState.type === 'error') {
      toast({ variant: 'destructive', title: 'Error', description: formState.message });
    }
  }, [formState]);

  const openDialog = (state: Partial<DialogState>) => {
    const categoryDefaults = { name: '', visibleInPOS: true };
    setDialogState({ 
      ...initialDialogState, 
      isOpen: true, 
      category: categoryDefaults, 
      ...state, 
      category: {...categoryDefaults, ...state.category} 
    });
  };
  
  const closeDialog = () => setDialogState(initialDialogState);

  const handleDelete = () => {
    if (!categoryToDelete) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryToDelete.id);
      if (result.type === 'success') {
        toast({ title: 'Éxito', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    });
  }

  const confirmDelete = (category: ProductCategory) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  }

  const CategoryRow = ({ category, isSubcategory = false }: { category: ProductCategory; isSubcategory?: boolean }) => (
    <TableRow>
      <TableCell className={`font-medium ${isSubcategory ? 'pl-10' : ''}`}>
        {category.name}
      </TableCell>
       <TableCell className="text-center">
        {isSubcategory ? 'N/A' : (
            category.visibleInPOS ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-destructive mx-auto" />
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
            {!isSubcategory && (
                <Button variant="outline" size="sm" onClick={() => openDialog({ isSubcategory: true, parentId: category.id, category: { name: '', visibleInPOS: true }})}>
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
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onSelect={() => confirmDelete(category)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Categorías de Productos</CardTitle>
              <CardDescription>
                Crea y organiza las categorías y subcategorías de tus productos e inventario.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog({ category: { name: '', visibleInPOS: true } })}>
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
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-destructive">
                      Error al cargar las categorías.
                    </TableCell>
                  </TableRow>
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
            <form action={formAction}>
                <input type="hidden" name="id" value={dialogState.category?.id || ''} />
                {dialogState.parentId && <input type="hidden" name="parentId" value={dialogState.parentId} />}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                      id="name"
                      name="name"
                      defaultValue={dialogState.category?.name || ''} 
                      required 
                  />
                </div>
                {!dialogState.isSubcategory && (
                   <div className="flex items-center space-x-2">
                      <Switch 
                          id="visibleInPOS" 
                          name="visibleInPOS"
                          defaultChecked={dialogState.category?.visibleInPOS}
                      />
                      <Label htmlFor="visibleInPOS">Visible en Punto de Venta (POS)</Label>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría "{categoryToDelete?.name}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                       {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </AuthGuard>
  );
}
