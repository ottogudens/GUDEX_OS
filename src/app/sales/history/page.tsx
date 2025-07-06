"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { fetchClosedCashRegisterSessions } from '@/lib/data';
import type { CashRegisterSession } from '@/lib/types';
import { format } from 'date-fns';

export default function SalesHistoryPage() {
    const { toast } = useToast();
    const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                const data = await fetchClosedCashRegisterSessions();
                setSessions(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial de cajas.' });
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [toast]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (timestamp: any, includeTime = false) => {
        if (!timestamp) return 'N/A';
        const formatString = includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
        return format(timestamp.toDate(), formatString);
    };

    const getDifferenceVariant = (difference: number) => {
        if (difference === 0) return 'secondary';
        return difference > 0 ? 'default' : 'destructive';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Cajas Cerradas</CardTitle>
                <CardDescription>Consulta el resumen de todas las sesiones de caja finalizadas.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border-b">
                    <div className="grid grid-cols-4 items-center p-4 text-sm font-medium text-muted-foreground">
                        <div className="col-span-1">Fecha Cierre</div>
                        <div className="col-span-1">Abierta por</div>
                        <div className="col-span-1">Cerrada por</div>
                        <div className="col-span-1 text-right">Diferencia (Efectivo)</div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-2 pt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                           <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : sessions.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {sessions.map(session => {
                            const expectedCash = (session.initialAmount || 0) + (session.cashSales || 0) + (session.manualIncome || 0) - (session.manualExpense || 0);
                            const countedCash = session.finalAmounts ? session.finalAmounts.cash : (session.finalAmount || 0);
                            const difference = countedCash - expectedCash;
                            
                            return (
                                <AccordionItem value={session.id} key={session.id}>
                                    <AccordionTrigger className="p-4 text-sm font-normal hover:no-underline">
                                        <div className="grid grid-cols-4 w-full items-center">
                                            <div className="col-span-1 text-left font-medium">{formatDate(session.closedAt)}</div>
                                            <div className="col-span-1 text-left">{session.openedBy?.name || 'N/A'}</div>
                                            <div className="col-span-1 text-left">{session.closedBy?.name || 'N/A'}</div>
                                            <div className="col-span-1 text-right">
                                                <Badge variant={getDifferenceVariant(difference)}>
                                                    {formatCurrency(difference)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-muted/50">
                                            <h4 className="text-base font-semibold mb-2">Detalle de la Sesión #{session.id.slice(0,6)}</h4>
                                            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                                                <div className="font-medium text-muted-foreground">Concepto</div>
                                                <div className="font-medium text-muted-foreground text-right">Sistema</div>
                                                <div className="font-medium text-muted-foreground text-right">Contado</div>
                                                
                                                <div className="col-span-3 border-b my-1"></div>
                                                <div>Efectivo</div>
                                                <div className="text-right">{formatCurrency(expectedCash)}</div>
                                                <div className="text-right font-semibold">{formatCurrency(countedCash)}</div>

                                                <div className="col-span-3 border-b my-1"></div>
                                                <div>Tarjeta</div>
                                                <div className="text-right">{formatCurrency(session.cardSales || 0)}</div>
                                                <div className="text-right font-semibold">{formatCurrency(session.finalAmounts ? session.finalAmounts.card : 0)}</div>
                                                
                                                <div className="col-span-3 border-b my-1"></div>
                                                <div>Transferencia</div>
                                                <div className="text-right">{formatCurrency(session.transferSales || 0)}</div>
                                                <div className="text-right font-semibold">{formatCurrency(session.finalAmounts ? session.finalAmounts.transfer : 0)}</div>

                                                <div className="col-span-3 mt-2 text-xs text-muted-foreground">
                                                    <p>Monto Apertura: {formatCurrency(session.initialAmount)} | Ingresos Man.: {formatCurrency(session.manualIncome || 0)} | Egresos Man.: {formatCurrency(session.manualExpense || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center h-24 text-muted-foreground flex items-center justify-center">
                        No hay cajas cerradas en el historial.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
