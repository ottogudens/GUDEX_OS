
"use client";

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fetchActiveCashRegisterSession, fetchSalesBySessionId, fetchMovementsBySessionId } from '@/lib/data';
import { openCashRegister, closeCashRegister, addCashMovement } from '@/lib/mutations';
import type { CashRegisterSession, Sale, CashMovement } from '@/lib/types';
import { format } from 'date-fns';

export default function CashRegisterPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<CashRegisterSession | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [initialAmount, setInitialAmount] = useState('');

    const [manualMovementAmount, setManualMovementAmount] = useState('');
    const [manualMovementDescription, setManualMovementDescription] = useState('');
    
    const [closingAmounts, setClosingAmounts] = useState({ cash: '', card: '', transfer: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const activeSession = await fetchActiveCashRegisterSession();
            setSession(activeSession);
            if (activeSession) {
                const [sessionSales, sessionMovements] = await Promise.all([
                    fetchSalesBySessionId(activeSession.id),
                    fetchMovementsBySessionId(activeSession.id),
                ]);
                setSales(sessionSales);
                setMovements(sessionMovements);
            }
        } catch (error) {
            console.error("Error loading cash register data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la información de la caja.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const summary = useMemo(() => {
        if (!session) return null;
        
        const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
        const payments = sales.flatMap(s => s.payments);

        const cashSales = payments.filter(p => p.method === 'Efectivo').reduce((acc, p) => acc + p.amount, 0);
        const cardSales = payments.filter(p => p.method === 'Tarjeta').reduce((acc, p) => acc + p.amount, 0);
        const transferSales = payments.filter(p => p.method === 'Transferencia').reduce((acc, p) => acc + p.amount, 0);

        const manualIncome = movements.filter(m => m.type === 'income').reduce((acc, m) => acc + m.amount, 0);
        const manualExpense = movements.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0);
        
        const expectedInCash = session.initialAmount + cashSales + manualIncome - manualExpense;
        
        return { totalSales, cashSales, cardSales, transferSales, manualIncome, manualExpense, expectedInCash };
    }, [session, sales, movements]);
    
    const handleOpenRegister = () => {
        const amount = parseFloat(initialAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Monto inválido', description: 'Por favor, ingresa un monto de apertura positivo.' });
            return;
        }
        if (!user) {
             toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido identificar al usuario.' });
            return;
        }

        startTransition(async () => {
            try {
                await openCashRegister(amount, user.id, user.name);
                toast({ title: 'Caja Abierta', description: `La caja se ha abierto con ${formatCurrency(amount)}.` });
                await loadData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error al abrir caja', description: error.message });
            }
        });
    };
    
    const handleAddMovement = (type: 'income' | 'expense') => {
        const amount = parseFloat(manualMovementAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Monto inválido' });
            return;
        }
         if (!manualMovementDescription.trim()) {
            toast({ variant: 'destructive', title: 'Descripción requerida' });
            return;
        }
        if (!user || !session) return;

        startTransition(async () => {
            try {
                await addCashMovement(session.id, amount, manualMovementDescription, type, { id: user.id, name: user.name });
                toast({ title: 'Movimiento Registrado' });
                setManualMovementAmount('');
                setManualMovementDescription('');
                await loadData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    };

    const handleCloseRegister = () => {
        const cash = parseFloat(closingAmounts.cash || '0');
        const card = parseFloat(closingAmounts.card || '0');
        const transfer = parseFloat(closingAmounts.transfer || '0');

        if (isNaN(cash) || isNaN(card) || isNaN(transfer) || cash < 0 || card < 0 || transfer < 0) {
            toast({ variant: 'destructive', title: 'Montos inválidos', description: 'Ingresa montos de cierre válidos y no negativos.' });
            return;
        }
        if (!user || !session || !summary) return;

        const finalAmounts = { cash, card, transfer };

        startTransition(async () => {
            try {
                await closeCashRegister(session.id, finalAmounts, { id: user.id, name: user.name }, summary);
                toast({ title: 'Caja Cerrada' });
                setSession(null);
                setSales([]);
                setMovements([]);
                setClosingAmounts({ cash: '', card: '', transfer: '' });
                await loadData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error al cerrar caja', description: error.message });
            }
        });
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm');
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (!session) {
        return (
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Abrir Caja</CardTitle>
                    <CardDescription>
                        La caja está actualmente cerrada. Ingresa un monto inicial para comenzar a registrar ventas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="initialAmount">Monto Inicial en Efectivo</Label>
                            <Input id="initialAmount" type="number" placeholder="Ej: 50000" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={handleOpenRegister} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : 'Abrir Caja'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                     <CardHeader>
                        <CardTitle>Resumen de la Caja Actual</CardTitle>
                        <CardDescription>Abierta por {session.openedBy.name} el {formatDate(session.openedAt)}</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Monto Apertura (Efectivo):</span> <span>{formatCurrency(session.initialAmount)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Ingresos por Ventas:</span> <span>{formatCurrency(summary?.totalSales || 0)}</span></div>
                        <div className="flex justify-between pl-4"><span>└ En Efectivo:</span> <span className="text-green-500">{formatCurrency(summary?.cashSales || 0)}</span></div>
                        <div className="flex justify-between pl-4"><span>└ Con Tarjeta:</span> <span>{formatCurrency(summary?.cardSales || 0)}</span></div>
                        <div className="flex justify-between pl-4"><span>└ Por Transferencia:</span> <span>{formatCurrency(summary?.transferSales || 0)}</span></div>
                        <div className="flex justify-between"><span>+ Ingresos Manuales:</span> <span className="text-green-500">{formatCurrency(summary?.manualIncome || 0)}</span></div>
                        <div className="flex justify-between"><span>- Egresos Manuales:</span> <span className="text-destructive">{formatCurrency(summary?.manualExpense || 0)}</span></div>
                     </CardContent>
                     <CardFooter className="font-bold border-t pt-4 mt-4 text-base">
                         <div className="flex justify-between w-full"><span>Total Esperado en Caja:</span> <span>{formatCurrency(summary?.expectedInCash || 0)}</span></div>
                     </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Cerrar Caja</CardTitle>
                        <CardDescription>Ingresa los montos finales contados para cada método de pago.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <Label htmlFor="finalCashAmount">Monto contado en Efectivo</Label>
                           <Input id="finalCashAmount" type="number" placeholder="Monto en efectivo" value={closingAmounts.cash} onChange={(e) => setClosingAmounts(prev => ({...prev, cash: e.target.value}))} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="finalCardAmount">Monto total en Tarjetas</Label>
                           <Input id="finalCardAmount" type="number" placeholder="Monto en tarjetas" value={closingAmounts.card} onChange={(e) => setClosingAmounts(prev => ({...prev, card: e.target.value}))} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="finalTransferAmount">Monto total en Transferencias</Label>
                           <Input id="finalTransferAmount" type="number" placeholder="Monto en transferencias" value={closingAmounts.transfer} onChange={(e) => setClosingAmounts(prev => ({...prev, transfer: e.target.value}))} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full" disabled={isPending || (!closingAmounts.cash && !closingAmounts.card && !closingAmounts.transfer)}>Cerrar Caja</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar Cierre de Caja?</AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div>
                                            Revisa que los montos ingresados sean correctos. Esta acción no se puede deshacer.
                                            <ul className="list-disc pl-5 mt-2 text-sm">
                                                <li>Efectivo: {formatCurrency(parseFloat(closingAmounts.cash || '0'))}</li>
                                                <li>Tarjeta: {formatCurrency(parseFloat(closingAmounts.card || '0'))}</li>
                                                <li>Transferencia: {formatCurrency(parseFloat(closingAmounts.transfer || '0'))}</li>
                                            </ul>
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCloseRegister} disabled={isPending}>
                                        {isPending ? 'Cerrando...' : 'Sí, Cerrar Caja'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ingresos y Egresos Manuales</CardTitle>
                        <CardDescription>Registra movimientos de dinero que no son ventas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                             <Input placeholder="Monto" type="number" value={manualMovementAmount} onChange={(e) => setManualMovementAmount(e.target.value)} />
                             <Input placeholder="Descripción (ej. pago proveedor)" value={manualMovementDescription} onChange={(e) => setManualMovementDescription(e.target.value)}/>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="w-full" onClick={() => handleAddMovement('income')} disabled={isPending}><ArrowUpCircle className="mr-2"/> Registrar Ingreso</Button>
                            <Button variant="outline" className="w-full" onClick={() => handleAddMovement('expense')} disabled={isPending}><ArrowDownCircle className="mr-2"/> Registrar Egreso</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Movimientos de la Sesión</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="text-center h-24">Sin movimientos manuales</TableCell></TableRow>
                                ) : (
                                    movements.map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell>
                                                <p>{m.description}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(m.createdAt)} por {m.createdBy.name}</p>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${m.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                                                {m.type === 'income' ? '+' : '-'} {formatCurrency(m.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
