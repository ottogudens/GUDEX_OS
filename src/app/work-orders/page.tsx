
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, PlayCircle, PauseCircle, CheckCircle, Camera, ChevronsRight, CircleOff, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AuthGuard } from '@/components/AuthGuard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder, Customer, Vehicle, Product, Service, SaleItem } from '@/lib/types';
import { 
    fetchWorkOrders, 
    fetchCustomers,
    fetchProducts,
    fetchServices,
    fetchVehiclesByCustomerId
} from '@/lib/data';
import { createWorkOrder, updateWorkOrderStatus } from '@/lib/mutations';
import { WorkOrderSchema, type WorkOrderFormData } from '@/lib/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type WorkOrderColumns = {
  backlog: WorkOrder[];
  inProgress: WorkOrder[];
  approval: WorkOrder[];
  completed: WorkOrder[];
  paid: WorkOrder[];
};

const WorkOrderCard = ({ order, onStatusChange }: { order: WorkOrder; onStatusChange: (id: string, status: WorkOrder['status']) => void; }) => {
    
    const nextStatus: { [key in WorkOrder['status']]?: WorkOrder['status'] } = {
        backlog: 'inProgress',
        inProgress: 'approval',
        approval: 'completed',
    };

    const nextActionIcon = {
        inProgress: <PlayCircle className="w-4 h-4 mr-1"/>,
        approval: <PauseCircle className="w-4 h-4 mr-1"/>,
        completed: <CheckCircle className="w-4 h-4 mr-1"/>
    };
    
    const nextActionText = {
        inProgress: 'Iniciar',
        approval: 'A Aprobación',
        completed: 'Completar'
    }

    const handleNextStatus = () => {
        const newStatus = nextStatus[order.status];
        if (newStatus) {
            onStatusChange(order.id, newStatus);
        }
    }
    
    return (
        <Card className="mb-4 hover:shadow-accent/20 hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader className="p-4">
            {order.image && (
                <Image
                src={order.image}
                alt={order.title}
                width={600}
                height={400}
                className="rounded-t-lg -mx-4 -mt-4 mb-4 object-cover"
                data-ai-hint={order['data-ai-hint']}
                />
            )}
            <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold leading-tight pr-2">
                {order.title}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-6 h-6 -mt-1 -mr-1 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/work-orders/${order.id}`}>Ver Detalles</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
                #{order.code} &bull; {order.vehicle}
            </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                {nextStatus[order.status] ? (
                    <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={handleNextStatus}>
                       {nextActionIcon[nextStatus[order.status]!]} {nextActionText[nextStatus[order.status]!]}
                    </Button>
                ) : (
                    <div className="p-1 text-xs flex items-center"><CircleOff className="w-4 h-4 mr-1"/> Sin acciones</div>
                )}
                 <Link href={`/dvi?orderId=${order.id}`} className="p-1 h-auto">
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <Camera className="w-4 h-4 mr-1"/> DVI
                    </Button>
                </Link>
            </div>
            <div className="flex justify-between items-center mt-2">
                <Badge variant="outline">{order.customer}</Badge>
                <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{order.assignedTo}</AvatarFallback>
                </Avatar>
                </div>
            </div>
            </CardContent>
        </Card>
    );
};

export default function WorkOrdersPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Data from Firestore
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  
  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<WorkOrderFormData>>({});
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [itemToAdd, setItemToAdd] = useState<string>('');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };
  
  const loadData = React.useCallback(async () => {
      setLoading(true);
      try {
          const [ordersData, customersData, productsData, servicesData] = await Promise.all([
              fetchWorkOrders(), 
              fetchCustomers(),
              fetchProducts(),
              fetchServices()
          ]);
          setWorkOrders(ordersData);
          setCustomers(customersData);
          setProducts(productsData);
          setServices(servicesData);
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      } finally {
          setLoading(false);
      }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const workOrderColumns = useMemo<WorkOrderColumns>(() => {
    const columns: WorkOrderColumns = { backlog: [], inProgress: [], approval: [], completed: [], paid: [] };
    workOrders.forEach(order => {
        if (columns[order.status]) {
            columns[order.status].push(order);
        }
    });
    return columns;
  }, [workOrders]);
  
  const columns = [
    { id: 'backlog', title: 'Pendientes', orders: workOrderColumns.backlog },
    { id: 'inProgress', title: 'En Progreso', orders: workOrderColumns.inProgress },
    { id: 'approval', title: 'Esperando Aprobación', orders: workOrderColumns.approval },
    { id: 'completed', title: 'Completadas', orders: workOrderColumns.completed },
    { id: 'paid', title: 'Pagadas', orders: workOrderColumns.paid },
  ];

  const sellableItems = useMemo(() => [
    ...products.map(p => ({ id: p.id, name: p.name, price: p.salePrice, itemType: 'product' as const, display: `[Producto] ${p.name}` })),
    ...services.map(s => ({ id: s.id, name: s.name, price: s.price, itemType: 'service' as const, display: `[Servicio] ${s.name}` }))
  ], [products, services]);

  const calculatedTotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [selectedItems]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setNewOrder(prev => ({ ...prev, [id]: value }));
  };

  const handleCustomerSelect = async (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
          setNewOrder(prev => ({ ...prev, customerId: customer.id, customer: customer.name, vehicleId: undefined, vehicle: undefined }));
          setCustomerVehicles([]);
          try {
            const vehicles = await fetchVehiclesByCustomerId(customerId);
            setCustomerVehicles(vehicles);
          } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los vehículos del cliente.' });
          }
      }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = customerVehicles.find(v => v.id === vehicleId);
    if(vehicle) {
        setNewOrder(prev => ({ ...prev, vehicleId: vehicle.id, vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}));
    }
  }

  const handleStatusChange = (orderId: string, status: WorkOrder['status']) => {
    startTransition(async () => {
        try {
            await updateWorkOrderStatus(orderId, status);
            setWorkOrders(prev => prev.map(o => o.id === orderId ? {...o, status} : o));
            toast({ title: 'Éxito', description: `Orden de trabajo actualizada a: ${status}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };
  
  const handleAddItem = () => {
    if (!itemToAdd) return;
    const [type, id] = itemToAdd.split('-');
    const item = sellableItems.find(i => i.itemType === type && i.id === id);

    if (item) {
        setSelectedItems(prev => {
            const existingItemIndex = prev.findIndex(i => i.id === item.id && i.itemType === item.itemType);
            if (existingItemIndex > -1) {
                const newItems = [...prev];
                newItems[existingItemIndex].quantity += 1;
                return newItems;
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setSelectedItems(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleQuantityChange = (indexToUpdate: number, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 0) return;
    setSelectedItems(prev => prev.map((item, index) => index === indexToUpdate ? { ...item, quantity } : item));
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToValidate = {
      title: newOrder.title,
      description: newOrder.description,
      customer: newOrder.customer,
      customerId: newOrder.customerId,
      vehicle: newOrder.vehicle,
      vehicleId: newOrder.vehicleId,
      items: selectedItems.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, itemType: i.itemType as 'product'|'service' }))
    };

    const validatedFields = WorkOrderSchema.safeParse(dataToValidate);

    if(!validatedFields.success) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
        return;
    }

    startTransition(async () => {
        try {
            await createWorkOrder(validatedFields.data);
            toast({ title: 'Éxito', description: 'Orden de trabajo creada.' });
            await loadData();
            setIsDialogOpen(false);
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  const handleOpenDialog = () => {
    setNewOrder({});
    setSelectedItems([]);
    setCustomerVehicles([]);
    setItemToAdd('');
    setIsDialogOpen(true);
  };

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-2xl font-bold font-headline">Kanban de Órdenes de Trabajo</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Orden de Trabajo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Orden de Trabajo</DialogTitle>
                <DialogDescription>
                  Completa el formulario para añadir una nueva orden de trabajo al tablero.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOrder}>
                <ScrollArea className="max-h-[70vh] p-1">
                  <div className="grid gap-4 py-4 px-6">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título del Trabajo</Label>
                      <Input id="title" placeholder="ej. Revisión de frenos y cambio de pastillas" onChange={handleFormChange} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descripción del Problema Reportado</Label>
                      <Textarea id="description" placeholder="ej. Cliente reporta un chillido al frenar y el pedal se siente esponjoso." onChange={handleFormChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customerId">Cliente</Label>
                        <Select onValueChange={handleCustomerSelect} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="vehicleId">Vehículo</Label>
                        <Select name="vehicleId" onValueChange={handleVehicleSelect} required disabled={!newOrder.customerId || customerVehicles.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder={!newOrder.customerId ? "Selecciona un cliente primero" : "Selecciona un vehículo"} />
                            </SelectTrigger>
                            <SelectContent>
                                {customerVehicles.map(v => <SelectItem key={v.id} value={v.id}>{`${v.make} ${v.model} (${v.licensePlate})`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid gap-2 pt-4 border-t">
                      <Label>Ítems de la Orden</Label>
                      <div className="flex items-center gap-2">
                        <Select value={itemToAdd} onValueChange={setItemToAdd}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar producto o servicio..." /></SelectTrigger>
                          <SelectContent>
                            {sellableItems.map(item => <SelectItem key={`${item.itemType}-${item.id}`} value={`${item.itemType}-${item.id}`}>{item.display}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddItem} disabled={!itemToAdd}>Añadir</Button>
                      </div>
                      <div className="rounded-md border mt-2 max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                                <TableHead>Ítem</TableHead>
                                <TableHead className="w-[80px]">Cant.</TableHead>
                                <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Añade ítems a la orden</TableCell>
                                </TableRow>
                            ) : selectedItems.map((item, index) => (
                              <TableRow key={`${item.itemType}-${item.id}-${index}`}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                  <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(index, e.target.value)} className="h-8 w-16" min="1" />
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                <TableCell className="p-1">
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(index)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-right font-bold text-lg mt-2">
                        Valor Total: {formatCurrency(calculatedTotal)}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? 'Creando...' : 'Crear Orden'}
                    </Button>
                  </div>
                </ScrollArea>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start overflow-x-auto pb-4">
          {loading ? 
            Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card/50 rounded-lg h-full min-w-[300px] flex flex-col p-4 space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ))
            : columns.map((column) => (
            <div key={column.id} className="bg-muted/40 rounded-lg h-full min-w-[300px] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">
                  {column.title}{' '}
                  <Badge variant="secondary" className="ml-2">
                    {column.orders.length}
                  </Badge>
                </h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {column.orders.length > 0 ? (
                    column.orders.map((order) => (
                    <WorkOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground pt-8">
                        No hay órdenes en esta columna.
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
