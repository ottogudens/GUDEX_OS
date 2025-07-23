
"use client";

import * as React from 'react';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, FileText, Check, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, ProductCategory } from '@/lib/types';
import { fetchProducts, fetchProductCategories } from '@/lib/data';
import { createProduct, deleteProduct } from '@/lib/mutations';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ProductSchema } from '@/lib/schemas';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const { toast } = useToast();

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubcategory, setFilterSubcategory] = useState('all');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchProductCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de productos y categorías.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentSubcategories = useMemo(() => {
    if (filterCategory === 'all') return [];
    const cat = categories.find(c => c.id === filterCategory);
    return cat?.subcategories || [];
  }, [filterCategory, categories]);

  const filteredProducts = useMemo(() => {
    if (filterCategory === 'all') return products;

    const category = categories.find(c => c.id === filterCategory);
    if (!category) return products;

    let items = products.filter(p => p.category === category.name);

    if (filterSubcategory !== 'all') {
      const subcategory = category.subcategories?.find(s => s.id === filterSubcategory);
      if (subcategory) {
        items = items.filter(p => p.subcategory === subcategory.name);
      }
    }
    return items;
  }, [products, filterCategory, filterSubcategory, categories]);

  const closeDialog = () => setDialogState(initialDialogState);
  const openDialogForNew = () => setDialogState({ isOpen: true, isEditing: false, product: null });
  const openDialogForEdit = (product: Product) => setDialogState({ isOpen: true, isEditing: true, product });

  const handleSuccess = () => {
    closeDialog();
    loadData(); // Reload all data
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
        try {
            await deleteProduct(id);
            toast({ title: 'Éxito', description: 'Producto eliminado correctamente.' });
            await loadData();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el producto.' });
        }
    });
  };
  
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const handleDownloadData = () => {
    if (products.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No hay productos',
            description: 'No hay productos para exportar.',
        });
        return;
    }

    const dataToExport = products.map(p => ({
        "ID": p.id,
        "Codigo": p.code,
        "Codigo Barra": p.barcode || '',
        "Nombre": p.name,
        "Marca": p.brand || '',
        "Precio Compra": p.purchasePrice || 0,
        "Precio Venta": p.salePrice,
        "Stock": p.stock,
        "Categoria": p.category,
        "Sub-Categoria": p.subcategory || '',
        "Visible en POS": p.visibleInPOS
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "productos_existentes.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        startTransition(async () => {
            let successCount = 0;
            for (const row of rows) {
                const dataToValidate = {
                    name: row['Nombre'],
                    brand: row['Marca'],
                    salePrice: Number(row['Precio Venta']),
                    purchasePrice: Number(row['Precio Compra']),
                    stock: Number(row['Stock']),
                    barcode: row['Codigo Barra'],
                    category: row['Categoria'],
                    subcategory: row['Sub-Categoria'] || '',
                    visibleInPOS: String(row['Visible en POS']).toLowerCase() === 'true',
                };

                const validatedFields = ProductSchema.safeParse(dataToValidate);

                if (validatedFields.success) {
                    await createProduct(validatedFields.data);
                    successCount++;
                } else {
                    console.warn("Skipping invalid row:", row, validatedFields.error.flatten());
                }
            }
            if (successCount > 0) {
                 toast({
                    title: 'Carga Exitosa',
                    description: `${successCount} nuevos productos han sido añadidos.`,
                });
                await loadData();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error de Carga',
                    description: 'No se encontraron productos válidos en el archivo o el formato es incorrecto.',
                });
            }
        });
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
            variant: 'destructive',
            title: 'Error de Carga',
            description: 'Hubo un problema al procesar el archivo.',
        });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Productos</CardTitle>
            <CardDescription>
              Administra los productos y repuestos de tu inventario.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadData}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar Productos
            </Button>
            <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {isPending ? 'Cargando...' : 'Cargar Excel'}
            </Button>
            <input type="file" id="file-upload" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button onClick={openDialogForNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
             <div className="grid gap-1.5">
                <Label htmlFor="filter-category">Categoría</Label>
                <Select value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setFilterSubcategory('all'); }}>
                    <SelectTrigger id="filter-category" className="w-[180px]">
                        <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="filter-subcategory">Subcategoría</Label>
                <Select value={filterSubcategory} onValueChange={setFilterSubcategory} disabled={filterCategory === 'all' || currentSubcategories.length === 0}>
                    <SelectTrigger id="filter-subcategory" className="w-[180px]">
                        <SelectValue placeholder="Filtrar por subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {currentSubcategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead className="w-[80px]">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-center">En POS</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell>
                      <Image 
                        src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                        alt={product.name}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                        data-ai-hint="product image"
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
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
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
                                      <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
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
      />
    </AuthGuard>
  );
}
