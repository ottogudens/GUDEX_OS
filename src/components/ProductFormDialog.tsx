
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Package } from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/types';
import { createProduct, updateProduct, createProductCategory } from '@/lib/mutations';
import { ProductSchema } from '@/lib/schemas';
import { lookupBarcode } from '@/lib/barcode-data';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchProductCategories } from '@/lib/data';

const initialProductState: Partial<Product> = {
  name: '',
  brand: '',
  category: '',
  subcategory: '',
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  barcode: '',
  imageUrl: '',
  visibleInPOS: false,
};

interface ProductFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isEditing?: boolean;
    initialProductData?: Partial<Product> | null;
    onSuccess: () => void;
}

export function ProductFormDialog({ 
    isOpen, 
    onOpenChange, 
    isEditing = false, 
    initialProductData, 
    onSuccess 
}: ProductFormDialogProps) {
    
    const [isPending, startTransition] = useTransition();
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>(initialProductState);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const { toast } = useToast();

    // State for categories
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');

    const loadCategories = async () => {
        try {
            const catData = await fetchProductCategories();
            setCategories(catData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las categorías.' });
        }
    };

    useEffect(() => {
        if (isOpen) {
            const data = initialProductData ? { ...initialProductState, ...initialProductData } : initialProductState;
            setCurrentProduct(data);
            setImagePreview(data.imageUrl || null);
            setImageFile(null);
            loadCategories();
        } else {
            // Reset creation states when dialog closes
            setIsCreatingCategory(false);
            setNewCategoryName('');
            setIsCreatingSubcategory(false);
            setNewSubcategoryName('');
        }
    }, [isOpen, initialProductData]);
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setCurrentProduct(prev => ({ 
          ...prev, 
          [id]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setCurrentProduct(prev => ({ ...prev, visibleInPOS: checked }));
    };

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
    
    const handleBarcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const barcode = e.target.value;
        if (!barcode || currentProduct.name) return;
        
        toast({ title: 'Buscando código de barras...' });
        const result = await lookupBarcode(barcode);
        if (result) {
            toast({ title: '¡Producto encontrado!', description: result.name });
            setCurrentProduct(prev => ({ ...prev, name: result.name, imageUrl: result.imageUrl }));
            setImagePreview(result.imageUrl);
        } else {
            toast({ variant: 'destructive', title: 'No encontrado', description: 'No se encontró un producto para ese código.'});
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            try {
                let categoryToSave = currentProduct.category || '';
                let subcategoryToSave = currentProduct.subcategory || '';
                let parentCategoryId: string | null = null;
                
                if (isCreatingCategory && newCategoryName.trim()) {
                    await createProductCategory({ name: newCategoryName.trim() });
                    categoryToSave = newCategoryName.trim();
                    const updatedCategories = await fetchProductCategories();
                    setCategories(updatedCategories);
                    const newCat = updatedCategories.find(c => c.name === categoryToSave);
                    if (newCat) parentCategoryId = newCat.id;
                } else if (categoryToSave) {
                    const parentCat = categories.find(c => c.name === categoryToSave);
                    if (parentCat) parentCategoryId = parentCat.id;
                }

                if (isCreatingSubcategory && newSubcategoryName.trim() && parentCategoryId) {
                     await createProductCategory({ name: newSubcategoryName.trim(), parentId: parentCategoryId });
                     subcategoryToSave = newSubcategoryName.trim();
                }

                const finalProductData = {
                    ...currentProduct,
                    category: categoryToSave,
                    subcategory: subcategoryToSave,
                };
                
                const validatedFields = ProductSchema.safeParse(finalProductData);

                if (!validatedFields.success) {
                    toast({ variant: 'destructive', title: 'Error de Validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
                    return;
                }
                
                const dataToSave = validatedFields.data;
                if (isEditing && currentProduct.id) {
                    await updateProduct(currentProduct.id, dataToSave, imageFile);
                    toast({ title: 'Éxito', description: 'Producto actualizado correctamente.' });
                } else {
                    await createProduct(dataToSave, imageFile);
                    toast({ title: 'Éxito', description: 'Producto creado correctamente.' });
                }
                onSuccess();
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar el producto.' });
            }
        });
    };
    
    const selectedCategoryData = categories.find(c => c.name === currentProduct.category);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                    <DialogDescription>Completa la información del producto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFormSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <div className="col-span-1">
                                <Label htmlFor="picture">Imagen</Label>
                                <div className="mt-2 aspect-square w-full border border-dashed rounded-lg flex items-center justify-center relative">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Vista previa" layout="fill" className="object-cover rounded-lg"/>
                                    ) : (
                                        <Package className="w-16 h-16 text-muted-foreground"/>
                                    )}
                                    <Input id="picture" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleImageChange} />
                                </div>
                            </div>
                            <div className="col-span-2 space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="barcode">Código de Barras (Opcional)</Label>
                                    <Input id="barcode" placeholder="Escanear o tipear código" value={currentProduct.barcode || ''} onChange={handleFormChange} onBlur={handleBarcodeBlur} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nombre del Producto</Label>
                                        <Input id="name" placeholder="ej. Filtro de Aceite" value={currentProduct.name || ''} onChange={handleFormChange} required />
                                    </div>
                                     <div className="grid gap-2">
                                        <Label htmlFor="brand">Marca (Opcional)</Label>
                                        <Input id="brand" placeholder="ej. Bosch" value={currentProduct.brand || ''} onChange={handleFormChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select
                                    value={isCreatingCategory ? 'create_new' : currentProduct.category || ''}
                                    onValueChange={(value) => {
                                        if (value === 'create_new') {
                                            setIsCreatingCategory(true);
                                            setCurrentProduct(prev => ({ ...prev, category: '', subcategory: '' }));
                                        } else {
                                            setIsCreatingCategory(false);
                                            setCurrentProduct(prev => ({ ...prev, category: value, subcategory: '' }));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                                        <SelectItem value="create_new">+ Crear nueva categoría</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isCreatingCategory && (
                                    <Input 
                                        placeholder="Nombre de la nueva categoría"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="mt-2"
                                    />
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="subcategory">Subcategoría (Opcional)</Label>
                                <Select
                                    value={isCreatingSubcategory ? 'create_new_sub' : currentProduct.subcategory || ''}
                                    onValueChange={(value) => {
                                        if (value === 'create_new_sub') {
                                            setIsCreatingSubcategory(true);
                                            setCurrentProduct(prev => ({...prev, subcategory: ''}));
                                        } else {
                                            setIsCreatingSubcategory(false);
                                            setCurrentProduct(prev => ({...prev, subcategory: value}));
                                        }
                                    }}
                                    disabled={!selectedCategoryData || isCreatingCategory}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedCategoryData ? "Selecciona categoría" : "Selecciona subcategoría"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedCategoryData?.subcategories?.map(sub => (
                                            <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                                        ))}
                                        {selectedCategoryData && <SelectItem value="create_new_sub">+ Crear nueva subcategoría</SelectItem>}
                                    </SelectContent>
                                </Select>
                                {isCreatingSubcategory && (
                                    <Input
                                        placeholder="Nombre de la nueva subcategoría"
                                        value={newSubcategoryName}
                                        onChange={e => setNewSubcategoryName(e.target.value)}
                                        className="mt-2"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="purchasePrice">Precio Compra (Neto)</Label>
                                <Input id="purchasePrice" type="number" step="1" value={currentProduct.purchasePrice || ''} onChange={handleFormChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="salePrice">Precio Venta</Label>
                                <Input id="salePrice" type="number" step="1" value={currentProduct.salePrice || ''} onChange={handleFormChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="stock">Stock Actual</Label>
                                <Input id="stock" type="number" step="1" value={currentProduct.stock || ''} onChange={handleFormChange} required />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="visibleInPOS" checked={!!currentProduct.visibleInPOS} onCheckedChange={handleSwitchChange} />
                            <Label htmlFor="visibleInPOS">Visible en Punto de Venta (POS)</Label>
                        </div>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Guardando...' : 'Guardar Producto'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
