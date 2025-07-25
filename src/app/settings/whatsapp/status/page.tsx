
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Power, PowerOff, RefreshCw, Loader2, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBotStatusAction, startBotAction, stopBotAction, restartBotAction } from './actions';

type BotStatus = 'online' | 'stopped' | 'errored';

export default function WhatsappStatusPage() {
    const [status, setStatus] = useState<BotStatus>('stopped');
    const [details, setDetails] = useState('Cargando estado...');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();
    const { toast } = useToast();

    const checkStatus = async () => {
        setIsLoading(true);
        try {
            const result = await getBotStatusAction();
            setStatus(result.status);
            setDetails(result.details);
        } catch (error) {
            setStatus('errored');
            setDetails('No se pudo obtener el estado del bot.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 15000); // Refresca el estado cada 15 segundos
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: () => Promise<any>, successMessage: string) => {
        startTransition(async () => {
            const result = await action();
            if (result.success) {
                toast({ title: 'Éxito', description: successMessage });
                await checkStatus(); // Refresca el estado inmediatamente después de la acción
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };
    
    const statusInfo = {
        online: { color: 'text-green-500', text: 'En Línea' },
        stopped: { color: 'text-red-500', text: 'Detenido' },
        errored: { color: 'text-yellow-500', text: 'Error' },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server />Estado del Servicio del Bot</CardTitle>
                <CardDescription>
                    Monitorea y controla el proceso del bot de WhatsApp que se ejecuta en segundo plano.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold">Estado Actual</h3>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Verificando...</span>
                            </div>
                        ) : (
                            <>
                                <p className={`text-2xl font-bold ${statusInfo[status].color}`}>
                                    {statusInfo[status].text}
                                </p>
                                <p className="text-xs text-muted-foreground">{details}</p>
                            </>
                        )}
                    </div>
                    <Button variant="outline" size="icon" onClick={checkStatus} disabled={isLoading}>
                       <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Button 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isSubmitting || status === 'online'}
                        onClick={() => handleAction(startBotAction, 'El bot se está iniciando.')}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Power className="mr-2 h-4 w-4"/>}
                        Encender
                    </Button>
                     <Button 
                        variant="destructive"
                        disabled={isSubmitting || status === 'stopped'}
                        onClick={() => handleAction(stopBotAction, 'El bot se está deteniendo.')}
                     >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PowerOff className="mr-2 h-4 w-4"/>}
                        Apagar
                    </Button>
                    <Button 
                        variant="secondary"
                        disabled={isSubmitting}
                        onClick={() => handleAction(restartBotAction, 'El bot se está reiniciando.')}
                    >
                       {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                        Reiniciar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
