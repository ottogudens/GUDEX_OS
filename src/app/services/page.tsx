
"use client";

import { useState, useEffect, useTransition, useMemo } from 'react';
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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, FileText, Check, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { Service, ServiceCategory } from '@/lib/types';
import { fetchServices, fetchServiceCategories as fetchCategories } from '@/lib/data';
import { createService, updateService, deleteService as deleteServiceMutation, createServiceCategory } from '@/lib/mutations';
import { ServiceSchema } from '@/lib/schemas';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const initialServiceState: Partial<Service> = {
  name: '',
  category: '',
  subcategory: '',
  price: 0,
  availableInPOS: false,
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>(initialServiceState);
  
  // State for dynamic category creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const { toast } = useToast();

  const loadData = async () => {
      setLoading(true);
      try {
        const [servicesData, categoriesData] = await Promise.all([
            fetchServices(),
            fetchCategories()
        ]);
        setServices(servicesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  const resetCreationStates = () => {
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setIsCreatingSubcategory(false);
    setNewSubcategoryName('');
  };

  const openDialogForNew = () => {
    setIsEditing(false);
    setCurrentService(initialServiceState);
    resetCreationStates();
    setIsDialogOpen(true);
  };

  const openDialogForEdit = (service: Service) => {
    setIsEditing(true);
    setCurrentService(service);
    resetCreationStates();
    setIsDialogOpen(true);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setCurrentService(prev => ({ 
      ...prev, 
      [id]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setCurrentService(prev => ({ ...prev, availableInPOS: checked }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
        try {
            let categoryToSave = currentService.category || '';
            let subcategoryToSave = currentService.subcategory || '';
            let parentCategoryId: string | null = null;
            
            if (isCreatingCategory && newCategoryName.trim()) {
                await createServiceCategory({ name: newCategoryName.trim(), availableInPOS: true });
                categoryToSave = newCategoryName.trim();
                const updatedCategories = await fetchCategories();
                setCategories(updatedCategories);
                const newCat = updatedCategories.find(c => c.name === categoryToSave);
                if (newCat) parentCategoryId = newCat.id;
            } else if (categoryToSave) {
                const parentCat = categories.find(c => c.name === categoryToSave);
                if (parentCat) parentCategoryId = parentCat.id;
            }

            if (isCreatingSubcategory && newSubcategoryName.trim() && parentCategoryId) {
                 await createServiceCategory({ name: newSubcategoryName.trim(), parentId: parentCategoryId, availableInPOS: true });
                 subcategoryToSave = newSubcategoryName.trim();
            }

            const finalServiceData = {
                name: currentService.name,
                category: categoryToSave,
                subcategory: subcategoryToSave,
                price: currentService.price,
                availableInPOS: currentService.availableInPOS,
            };
            
            const validatedFields = ServiceSchema.safeParse(finalServiceData);

            if (!validatedFields.success) {
                toast({ variant: 'destructive', title: 'Error de Validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
                return;
            }

            if (isEditing) {
                await updateService(currentService.id!, validatedFields.data);
                toast({ title: 'Éxito', description: 'Servicio actualizado correctamente.' });
            } else {
                await createService(validatedFields.data);
                toast({ title: 'Éxito', description: 'Servicio creado correctamente.' });
            }
            setIsDialogOpen(false);
            await loadData();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar el servicio.' });
        }
    });
  };


  const deleteService = (id: string) => {
    startTransition(async () => {
        try {
            await deleteServiceMutation(id);
            setServices(services.filter(s => s.id !== id));
            toast({ title: 'Éxito', description: 'Servicio eliminado correctamente.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el servicio.' });
        }
    });
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  const handleDownloadData = () => {
    if (services.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No hay servicios',
            description: 'No hay servicios para exportar.',
        });
        return;
    }

    const dataToExport = services.map(s => ({
        "ID": s.id,
        "Codigo": s.code,
        "Nombre": s.name,
        "Categoria": s.category,
        "Subcategoria": s.subcategory || '',
        "Precio": s.price,
        "DisponibleEnPOS": s.availableInPOS
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");
    XLSX.writeFile(workbook, "servicios_existentes.xlsx");
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
                    category: row['Categoria'],
                    subcategory: row['Subcategoria'] || '',
                    price: Number(row['Precio']),
                    availableInPOS: String(row['DisponibleEnPOS']).toLowerCase() === 'true',
                };
                const validatedFields = ServiceSchema.safeParse(dataToValidate);
                if (validatedFields.success) {
                    await createService(validatedFields.data);
                    successCount++;
                } else {
                    console.warn("Skipping invalid row:", row, validatedFields.error.flatten());
                }
            }
            if (successCount > 0) {
                 toast({
                    title: 'Carga Exitosa',
                    description: `${successCount} nuevos servicios han sido añadidos.`,
                });
                await loadData();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error de Carga',
                    description: 'No se encontraron servicios válidos en el archivo o el formato es incorrecto.',
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
  
  const selectedCategoryData = useMemo(() => {
    return categories.find(c => c.name === currentService.category);
  }, [categories, currentService.category]);

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Servicios</CardTitle>
            <CardDescription>
              Crea, modifica y gestiona los servicios que ofrece tu taller.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadData}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar Servicios
            </Button>
            <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {isPending ? 'Cargando...' : 'Cargar Excel'}
            </Button>
            <input type="file" id="file-upload" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openDialogForNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Servicio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre del Servicio</Label>
                      <Input id="name" placeholder="ej. Cambio de llantas" value={currentService.name || ''} onChange={handleFormChange} required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="category">Categoría</Label>
                          <Select
                              value={isCreatingCategory ? 'create_new' : currentService.category || ''}
                              onValueChange={(value) => {
                                  if (value === 'create_new') {
                                      setIsCreatingCategory(true);
                                      setCurrentService(prev => ({ ...prev, category: '', subcategory: '' }));
                                  } else {
                                      setIsCreatingCategory(false);
                                      setCurrentService(prev => ({ ...prev, category: value, subcategory: '' }));
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
                                value={isCreatingSubcategory ? 'create_new_sub' : currentService.subcategory || ''}
                                onValueChange={(value) => {
                                    if (value === 'create_new_sub') {
                                        setIsCreatingSubcategory(true);
                                        setCurrentService(prev => ({...prev, subcategory: ''}));
                                    } else {
                                        setIsCreatingSubcategory(false);
                                        setCurrentService(prev => ({...prev, subcategory: value}));
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
                    <div className="grid gap-2">
                      <Label htmlFor="price">Valor (IVA Incluido)</Label>
                      <Input id="price" type="number" step="1" placeholder="ej. 150000" value={currentService.price || ''} onChange={handleFormChange} required />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="availableInPOS" checked={currentService.availableInPOS} onCheckedChange={handleSwitchChange} />
                        <Label htmlFor="availableInPOS">Disponible en Punto de Venta (POS)</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Servicio')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead className="text-right">Valor (IVA Incl.)</TableHead>
                <TableHead className="text-center">En POS</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : services.length > 0 ? (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-mono text-xs">{service.code}</TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.subcategory || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.price)}</TableCell>
                    <TableCell className="text-center">
                        {service.availableInPOS ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-destructive mx-auto" />}
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
                          <DropdownMenuItem onClick={() => openDialogForEdit(service)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteService(service.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No hay servicios creados.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
