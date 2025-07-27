
'use client';

import * as React from 'react';
import { useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, FileText, Check, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory } from '@/lib/types';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ProductSchema } from '@/lib/schemas';
import { createProductAction, deleteProductAction } from './actions';
import { formatCurrency } from '@/lib/utils';

interface ProductsClientPageProps {
  initialProducts: Product[];
  categories: ProductCategory[];
}

interface DialogState {
    isOpen: boolean;
    isEditing: boolean;
    product: Partial<Product> | null;
}

const initialDialogState: DialogState = {
    isOpen: false,
    isEditing: false,
    product: null,
};

export function ProductsClientPage({ initialProducts, categories }: ProductsClientPageProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterCategory = searchParams.get('category') || 'all';

  const handleFilterChange = (categoryId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (categoryId === 'all') {
        params.delete('category');
    } else {
        params.set('category', categoryId);
    }
    router.replace(`/products?${params.toString()}`);
  };

  const closeDialog = () => setDialogState(initialDialogState);
  const openDialogForNew = () => setDialogState({ isOpen: true, isEditing: false, product: null });
  const openDialogForEdit = (product: Product) => setDialogState({ isOpen: true, isEditing: true, product });

  const handleSuccess = () => {
    closeDialog();
    // En lugar de recargar, simplemente refrescamos el enrutador.
    // Next.js re-obtendrá los datos del servidor para la página actual.
    router.refresh();
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
        const result = await deleteProductAction(id);
        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            handleSuccess();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    });
  };
  
  const handleDownloadData = () => { /* ... (lógica existente) ... */ };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (lógica existente) ... */ };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            {/* ... (UI del Header existente) ... */}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
             <div className="grid gap-1.5">
                <Label htmlFor="filter-category">Categoría</Label>
                <Select value={filterCategory} onValueChange={handleFilterChange}>
                    <SelectTrigger id="filter-category" className="w-[180px]">
                        <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              {/* ... (UI del Header de la Tabla existente) ... */}
            </TableHeader>
            <TableBody>
              {initialProducts.length > 0 ? (
                initialProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell>
                      <Image 
                        src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                        alt={product.name}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand || 'N/A'}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-center">{product.stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.salePrice)}</TableCell>
                    <TableCell className="text-center">
                        {product.visibleInPOS ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-destructive mx-auto" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialogForEdit(product)}>
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
                                      <AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente "{product.name}".</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                                        {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                        No hay productos para los filtros seleccionados.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductFormDialog 
        isOpen={dialogState.isOpen}
        onOpenChange={(open) => !open && closeDialog()}
        isEditing={dialogState.isEditing}
        initialProductData={dialogState.product}
        onSuccess={handleSuccess}
        categories={categories}
      />
    </>
  );
}
