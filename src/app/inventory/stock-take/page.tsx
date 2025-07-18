
"use client";

import { useState, useTransition, KeyboardEvent, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { AuthGuard } from '@/components/AuthGuard'; // Assuming AuthGuard is handled by layout or higher level
import { Barcode, Search, Package, PlusCircle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product } from '@/lib/types';
import { fetchProductByBarcode } from '@/lib/data';
import { fetchStockLogs } from '@/lib/data';
import { updateProductStock } from '@/lib/mutations';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import { useAuth } from '@/context/AuthContext';
import type { StockLog } from '@/lib/types';


export default function StockTakePage() {

    // Utility function for debouncing
    const debounce = <T extends any[]>(func: (...args: T) => void, delay: number) => {
        let timeoutId: NodeJS.Timeout | null;
        return (...args: T) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };
    

    const { toast } = useToast();
    const { user } = useAuth();
    const [isSearching, startSearchTransition] = useTransition();
    const [isUpdating, startUpdateTransition] = useTransition();
    
    const [barcode, setBarcode] = useState('');
    const [lastSearchedBarcode, setLastSearchedBarcode] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newStock, setNewStock] = useState<string>('');
    const [productNotFound, setProductNotFound] = useState(false);
    const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
    const [loadingStockLogs, setLoadingStockLogs] = useState(true);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Refs for camera scanning
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const resetState = () => {
        setBarcode('');
        setSelectedProduct(null);
        setNewStock('');
        setProductNotFound(false);
    };

    // Original handleSearch function
    const handleSearch = useCallback((searchBarcode: string) => {
        if (!searchBarcode.trim()) {
            toast({ variant: 'destructive', title: 'Código de barras vacío', description: 'Por favor, ingresa un código para buscar.' });
            return;
        }

        setLastSearchedBarcode(searchBarcode);
        setBarcode(searchBarcode);

        startSearchTransition(async () => {
            setProductNotFound(false);
            setSelectedProduct(null);
            try {
                // Assuming fetchProductByBarcode is designed to handle potential errors gracefully
                const product = await fetchProductByBarcode(searchBarcode);
                if (product) {
                    setSelectedProduct(product);
                    setNewStock('');
                } else {
                    setProductNotFound(true);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error de Búsqueda', description: 'No se pudo realizar la búsqueda.' });
            }
        });
    }, [toast, startSearchTransition]);

    // Debounced version of handleSearch
    const debouncedSearch = useCallback(
        debounce((searchBarcode: string) => {
            handleSearch(searchBarcode);
        }, 400), // Adjust debounce delay as needed (e.g., 400ms)
        [handleSearch]
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Use the immediate handleSearch on Enter press
            handleSearch(barcode);
        }
    const handleStockUpdate = () => {
        if (!selectedProduct || !user) return;
        
        // Validate if newStock is a valid number string first
        if (newStock === '' || isNaN(Number(newStock))) {
            toast({ variant: 'destructive', title: 'Cantidad inválida', description: 'Por favor, ingresa una cantidad numérica válida.' });
            return;
        }

        const validation = StockUpdateSchema.safeParse({ newStock: Number(newStock) });
        if (!validation.success) {
            toast({ variant: 'destructive', title: 'Cantidad inválida', description: validation.error.errors[0].message });
            return;
        }
        const countedStock = validation.data.newStock;

        startUpdateTransition(async () => {
            try {
                await updateProductStock(selectedProduct, countedStock, { id: user.id, name: user.name });
                
                loadStockLogs(); // Reload logs after successful update

                toast({
                    title: '¡Stock Actualizado!',
                    description: `El stock de "${selectedProduct.name}" es ahora ${countedStock}.`,
                });
                resetState();
                // Re-focus the barcode input after successful update
                document.getElementById('barcode-input')?.focus();
            } catch (error: any) {
                // If update fails, just show toast, don't reset state
                // to allow user to potentially retry or correct
                toast({ variant: 'destructive', title: 'Error al actualizar', description: error.message });
            }
        });

    };
    
    const handleProductCreated = () => {
        setIsProductFormOpen(false);
        handleSearch(lastSearchedBarcode);
    };
    
    const stopScan = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startScan = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !streamRef.current) return;

        const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
        if (!canvasContext) return;

        const tick = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code && code.data) {
                    debouncedSearch(code.data); // Use debounced search for scanner
                    setIsScannerOpen(false); // This will trigger the useEffect cleanup
                    return;
                }
            }
            animationFrameIdRef.current = requestAnimationFrame(tick);
        };
        animationFrameIdRef.current = requestAnimationFrame(tick);
    }, [debouncedSearch]); // Use debouncedSearch here

    useEffect(() => {
        if (isScannerOpen) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current?.play();
                            startScan();
                        };
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera:", err);
                    toast({ variant: 'destructive', title: 'Error de cámara', description: 'No se pudo acceder a la cámara. Revisa los permisos.' });
                    setIsScannerOpen(false);
                });
        } else {
            stopScan();
        }

        return () => {
            stopScan();
        };
    }, [isScannerOpen, startScan, stopScan, toast, debouncedSearch]); // Added debouncedSearch

    // Effect to clean up debounce timeout on unmount
    useEffect(() => {
        return () => debouncedSearch.cancel?.(); // Assuming debounce utility might have a cancel method
    }, [debouncedSearch]);

    // Effect to load stock logs on component mount
    useEffect(() => {
        const loadStockLogs = async () => {
            try {
                setLoadingStockLogs(true);
                const logs = await fetchStockLogs();
                setStockLogs(logs);
            } catch (error) {
                console.error('Error loading stock logs:', error);
                toast({ variant: 'destructive', title: 'Error de Carga', description: 'No se pudieron cargar los registros de ajustes de stock.' });
            } finally {
                setLoadingStockLogs(false);
            }
        };
        loadStockLogs();
    }, [toast]); // Depend on toast if used within loadStockLogs

    const renderResult = () => {
        if (isSearching) {
            return <Skeleton className="h-48 w-full" />;
        }

        if (productNotFound) {
            return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <h3 className="font-semibold text-lg">Producto no encontrado</h3>
                    <p className="text-muted-foreground text-sm">El código de barras "{lastSearchedBarcode}" no está en tu base de datos.</p>
                    <Button onClick={() => setIsProductFormOpen(true)} className="mt-4">
                        <PlusCircle className="mr-2" />
                        Crear Nuevo Producto
                    </Button>
                </div>
            );
        }

        if (selectedProduct) {
            return (
                <Card>
                    <CardContent className="p-4 grid grid-cols-3 gap-4 items-center">
                        <div className="col-span-1">
                            <Image
                                src={selectedProduct.imageUrl || 'https://placehold.co/400x400.png'}
                                alt={selectedProduct.name}
                                width={150}
                                height={150}
                                className="rounded-md object-cover aspect-square"
                                data-ai-hint="product image"
                            />
                        </div>
                        <div className="col-span-2 space-y-4">
                            <div>
                                <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
                                <p className="text-sm text-muted-foreground">Stock Actual en Sistema: <span className="font-bold text-foreground">{selectedProduct.stock}</span></p>
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Label htmlFor="newStock">Nuevo Stock Físico</Label>
                                    <Input 
                                        id="newStock" 
                                        type="number"
                                        value={newStock}
                                        onChange={(e) => setNewStock(e.target.value)}
                                        placeholder="Cantidad contada"
                                        disabled={isUpdating}
                                    />
                                </div>
                                <Button onClick={handleStockUpdate} disabled={isUpdating || !newStock}>
                                    {isUpdating ? 'Guardando...' : 'Actualizar Stock'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="text-center p-8 border-2 border-dashed rounded-lg flex flex-col items-center">
                <Package className="w-12 h-12 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Escanea un producto para comenzar el conteo.</p>
            </div>
        );
    };

    return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
            <Card>
                <CardHeader>
                <CardTitle>Toma de Inventario</CardTitle>
                <CardDescription>
                    Escanea un código de barras para buscar un producto y actualizar su stock físico.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <Label htmlFor="barcode-input">Código de Barras</Label>
                             <div className="relative">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="barcode-input"
                                    placeholder="Escanea o tipea el código..."
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    onKeyDown={handleKeyDown} // Keep Enter key immediate
                                    className="pl-10"
                                    disabled={isSearching}
                                />
                            </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)} disabled={isSearching}>
                            <Camera className="h-5 w-5" />
                            <span className="sr-only">Escanear código</span>
                        </Button>
                        <Button onClick={() => handleSearch(barcode)} disabled={isSearching || !barcode}>
                           <Search className="mr-2" />
                           {isSearching ? 'Buscando...' : 'Buscar'}
                        </Button>
                    </div>

                    {renderResult()}
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Últimos Ajustes</CardTitle>
                    <CardDescription>Resumen de los cambios realizados en esta sesión.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Stock Anterior</TableHead>
                                <TableHead className="text-center">Stock Nuevo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adjustedItems.length > 0 ? (
                                adjustedItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-center">{item.oldStock}</TableCell>
                                        <TableCell className="text-center font-bold text-green-500">{item.newStock}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No se han realizado ajustes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Escanear Código de Barras</DialogTitle>
                <DialogDescription>Apunta la cámara al código del producto.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden mt-4">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                <div className="absolute inset-0 border-8 border-background/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" 
                     style={{ 
                         left: '50%', 
                         top: '50%', 
                         width: '80%', 
                         height: '40%', 
                         transform: 'translate(-50%, -50%)',
                     }}>
                </div>
            </div>
        </DialogContent>
      </Dialog>
      <canvas ref={canvasRef} className="hidden" />

      <ProductFormDialog
        isOpen={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        isEditing={false}
        initialProductData={{ barcode: lastSearchedBarcode }}
        onSuccess={handleProductCreated}
      />

    </AuthGuard>
    );
}
