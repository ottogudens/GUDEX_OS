"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, UserPlus, CreditCard, AlertCircle, Barcode, Search } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import type { Product, Service, ServiceCategory, Customer, WorkOrder, CashRegisterSession, ProductCategory } from '@/lib/types';
import { fetchProducts, fetchServices, fetchServiceCategories, fetchCustomers, fetchWorkOrders, fetchActiveCashRegisterSession, fetchProductCategories, fetchProductByBarcode } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddCustomerButton } from '@/components/AddCustomerButton';
import { PaymentDialog } from '@/components/PaymentDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type SellableItem = (Product | Service) & { itemType: 'product' | 'service' | 'work-order'; price: number; };
type CartItem = SellableItem & { quantity: number; };

const GENERAL_CUSTOMER_ID = 'general';

export default function POSPage() {
    const { toast } = useToast();
    
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [completedWorkOrders, setCompletedWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // POS logic state
    const [activeSession, setActiveSession] = useState<CashRegisterSession | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [itemTypeFilter, setItemTypeFilter] = useState<'product' | 'service'>('product');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [saleContext, setSaleContext] = useState<'direct' | 'customer' | 'workOrder'>('direct');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(GENERAL_CUSTOMER_ID);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    
    // Barcode search state
    const [barcode, setBarcode] = useState('');
    const [isSearching, startSearchTransition] = useTransition();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [productsData, servicesData, serviceCategoriesData, productCategoriesData, customersData, workOrdersData, sessionData] = await Promise.all([
                fetchProducts(),
                fetchServices(),
                fetchServiceCategories(),
                fetchProductCategories(),
                fetchCustomers(),
                fetchWorkOrders('completed'),
                fetchActiveCashRegisterSession()
            ]);
            setProducts(productsData.filter(p => p.visibleInPOS));
            setServices(servicesData.filter(s => s.availableInPOS));
            setServiceCategories(serviceCategoriesData.filter(c => c.availableInPOS));
            setProductCategories(productCategoriesData.filter(c => c.visibleInPOS));
            setCustomers(customersData);
            setCompletedWorkOrders(workOrdersData);
            setActiveSession(sessionData);
        } catch (error) {
            console.error("Failed to load POS data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos para el POS.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const sellableItems: SellableItem[] = useMemo(() => [
        ...products.map(p => ({ ...p, price: p.salePrice, itemType: 'product' as const })),
        ...services.map(s => ({ ...s, itemType: 'service' as const }))
    ], [products, services]);

    const currentCategories = useMemo(() => {
        return itemTypeFilter === 'product' ? productCategories : serviceCategories;
    }, [itemTypeFilter, productCategories, serviceCategories]);

    const displayedItems = useMemo(() => {
        if (saleContext === 'workOrder' && selectedWorkOrderId) return [];

        let items = sellableItems.filter(item => item.itemType === itemTypeFilter);
        
        if (selectedCategory !== 'all') {
            const cat = currentCategories.find(c => c.id === selectedCategory);
            if (cat) {
                 items = items.filter(item => item.category === cat.name);
                 if (selectedSubcategory !== 'all' && cat.subcategories) {
                    const subcat = cat.subcategories.find(s => s.id === selectedSubcategory);
                    if (subcat) {
                        items = items.filter(item => item.subcategory === subcat.name);
                    }
                 }
            }
        }
        return items.slice(0, 20);
    }, [sellableItems, selectedCategory, selectedSubcategory, currentCategories, saleContext, selectedWorkOrderId, itemTypeFilter]);

    const currentSubcategories = useMemo(() => {
        if (selectedCategory === 'all') return [];
        const cat = currentCategories.find(c => c.id === selectedCategory);
        return cat?.subcategories || [];
    }, [selectedCategory, currentCategories]);

    const handleItemTypeChange = (type: 'product' | 'service') => {
        setItemTypeFilter(type);
        setSelectedCategory('all');
        setSelectedSubcategory('all');
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setSelectedSubcategory('all');
    };

    const handleWorkOrderSelect = (workOrderId: string) => {
        setSelectedWorkOrderId(workOrderId);
        const workOrder = completedWorkOrders.find(wo => wo.id === workOrderId);
        if (workOrder) {
            setSelectedCustomerId(workOrder.customerId);
            setCart([{
                id: workOrder.id,
                name: workOrder.title,
                price: workOrder.total,
                quantity: 1,
                itemType: 'work-order',
            } as CartItem]);
        }
    };
    
    const resetSale = useCallback(() => {
        setCart([]);
        setSaleContext('direct');
        setSelectedCustomerId(GENERAL_CUSTOMER_ID);
        setSelectedWorkOrderId(null);
    }, []);

    const handleSaleContextChange = (context: 'direct' | 'customer' | 'workOrder') => {
        resetSale();
        setSaleContext(context);
        if (context === 'direct') {
            setSelectedCustomerId(GENERAL_CUSTOMER_ID);
        } else {
            setSelectedCustomerId(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };

    const addToCart = (item: SellableItem) => {
        if (saleContext === 'workOrder') {
            toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No se pueden añadir más ítems al pagar una orden de trabajo.' });
            return;
        }
        setCart((prevCart) => {
            const existingItem = prevCart.find((cartItem) => cartItem.id === item.id && cartItem.itemType === item.itemType);
            if (existingItem) {
                return prevCart.map((cartItem) =>
                    (cartItem.id === item.id && cartItem.itemType === item.itemType) ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    };
    
    const removeFromCart = (itemId: string, itemType: string) => {
        if (itemType === 'work-order') {
            resetSale();
            return;
        }
        setCart((prevCart) => prevCart.filter((item) => !(item.id === itemId && item.itemType === itemType)));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const handleProceedToPayment = () => {
        if (!activeSession) {
            toast({ variant: 'destructive', title: 'Caja Cerrada', description: 'Debes abrir la caja para registrar una venta.'});
            return;
        }
        if (cart.length === 0) {
            toast({ variant: 'destructive', title: 'Carrito vacío', description: 'Añade productos para poder pagar.'});
            return;
        }
        if (!selectedCustomerId) {
            toast({ variant: 'destructive', title: 'Cliente no seleccionado', description: 'Por favor, selecciona un cliente para la venta.'});
            return;
        }
        setIsPaymentDialogOpen(true);
    };

    const onPaymentSuccess = () => {
        setIsPaymentDialogOpen(false);
        resetSale();
        toast({ title: '¡Venta Registrada!', description: 'El recibo se ha generado.' });
    };

    const handleBarcodeSearch = async (code: string) => {
        if (!code.trim()) return;

        startSearchTransition(async () => {
            try {
                const product = await fetchProductByBarcode(code);
                if (product) {
                    addToCart({ ...product, price: product.salePrice, itemType: 'product' });
                    toast({
                        title: 'Producto Añadido',
                        description: `Se ha añadido "${product.name}" al carrito.`,
                    });
                    setBarcode('');
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Producto no encontrado',
                        description: `No se encontró ningún producto con el código de barras "${code}".`,
                    });
                }
            } catch (error) {
                console.error("Barcode search failed:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error de Búsqueda',
                    description: 'No se pudo buscar el producto.',
                });
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBarcodeSearch(barcode);
        }
    };
    
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <div className="flex flex-col gap-4 h-full">
                {!loading && !activeSession && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Caja Cerrada</AlertTitle>
                        <AlertDescription>
                            No se pueden registrar nuevas ventas. Por favor, ve a la sección de <Link href="/sales/cash-register" className="underline font-semibold">Ventas {'>'} Caja</Link> para abrir una nueva sesión.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid md:grid-cols-3 gap-6 md:h-[calc(100vh-12rem)] flex-1">
                    <div className="md:col-span-2 flex flex-col gap-4 h-full">
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={saleContext} onValueChange={(val) => handleSaleContextChange(val as any)}>
                                <SelectTrigger className="w-auto">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="direct">Venta Rápida</SelectItem>
                                    <SelectItem value="customer">Cliente Existente</SelectItem>
                                    <SelectItem value="workOrder">Desde Orden de Trabajo</SelectItem>
                                </SelectContent>
                            </Select>

                            {saleContext === 'customer' && (
                                <Select value={selectedCustomerId || ''} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="flex-1 min-w-[200px]">
                                        <SelectValue placeholder="Seleccionar Cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                            {saleContext === 'workOrder' && (
                                <Select value={selectedWorkOrderId || ''} onValueChange={handleWorkOrderSelect}>
                                    <SelectTrigger className="flex-1 min-w-[200px]">
                                        <SelectValue placeholder="Seleccionar Orden Completada..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {completedWorkOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>#{wo.id.slice(-4)} - {wo.customer} - {wo.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                            <AddCustomerButton />
                        </div>
                        
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Label htmlFor="barcode-input">Buscar por Código de Barras</Label>
                                <div className="relative">
                                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="barcode-input"
                                        placeholder="Escanea o tipea el código y presiona Enter..."
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="pl-10"
                                        disabled={isSearching}
                                    />
                                </div>
                            </div>
                            <Button onClick={() => handleBarcodeSearch(barcode)} disabled={isSearching || !barcode}>
                                <Search className="mr-2" />
                                {isSearching ? 'Buscando...' : 'Buscar'}
                            </Button>
                        </div>

                        <Card>
                            <CardHeader className="p-2 flex-col space-y-2">
                                <Tabs value={itemTypeFilter} onValueChange={(value) => handleItemTypeChange(value as any)}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="product">Productos</TabsTrigger>
                                        <TabsTrigger value="service">Servicios</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Tabs value={selectedCategory} onValueChange={handleCategorySelect}>
                                    <TabsList className="h-auto flex-wrap justify-start">
                                        <TabsTrigger value="all">Todos</TabsTrigger>
                                        {currentCategories.map(cat => (
                                            <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </CardHeader>
                        </Card>

                        {currentSubcategories.length > 0 && (
                            <Card>
                                <CardHeader className="p-2">
                                    <Tabs value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                                        <TabsList className="h-auto flex-wrap justify-start">
                                            <TabsTrigger value="all">Todas</TabsTrigger>
                                            {currentSubcategories.map(sub => (
                                                <TabsTrigger key={sub.id} value={sub.id}>{sub.name}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </CardHeader>
                            </Card>
                        )}
                        
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            <ScrollArea className="flex-1">
                                <CardContent className="p-4">
                                    {loading ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                                        </div>
                                    ) : displayedItems.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {displayedItems.map(item => (
                                            <Card key={`${item.itemType}-${item.id}`} className="flex flex-col justify-between cursor-pointer hover:border-primary" onClick={() => addToCart(item as SellableItem)}>
                                                <CardHeader className="p-2">
                                                    <CardTitle className="text-sm">{item.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2">
                                                    <p className="text-lg font-bold">{formatCurrency(item.price)}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground p-8 h-full flex items-center justify-center">
                                            <p>No se encontraron productos o servicios.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </ScrollArea>
                        </Card>
                    </div>

                    <Card className="md:col-span-1 flex flex-col">
                        <CardHeader>
                            <CardTitle>Venta Actual</CardTitle>
                            <p className="text-sm text-muted-foreground">Cliente: {selectedCustomer?.name || 'Venta de Mesón'}</p>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-center">Cant.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                    El carrito está vacío.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cart.map(item => (
                                                <TableRow key={`${item.itemType}-${item.id}`}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                                    <TableCell className="p-1">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.id, item.itemType)}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-4 !pt-6 border-t">
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(calculateTotal())}</span>
                            </div>
                            <Button size="lg" onClick={handleProceedToPayment} disabled={!activeSession}>
                                <CreditCard className="mr-2" /> Proceder al Pago
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
            {isPaymentDialogOpen && (
                <PaymentDialog 
                    isOpen={isPaymentDialogOpen}
                    onClose={() => setIsPaymentDialogOpen(false)}
                    cart={cart}
                    total={calculateTotal()}
                    customer={selectedCustomerId === GENERAL_CUSTOMER_ID ? { id: GENERAL_CUSTOMER_ID, name: 'Cliente Varios' } as Customer : selectedCustomer}
                    workOrderId={selectedWorkOrderId}
                    cashRegisterSessionId={activeSession?.id || null}
                    onSuccess={onPaymentSuccess}
                />
            )}
        </AuthGuard>
    );
}
