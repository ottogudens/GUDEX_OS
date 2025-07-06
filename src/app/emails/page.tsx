"use client";

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, MailCheck, MailWarning, Info, AlertCircle } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSentEmails, fetchEmailLogs } from '@/lib/data';
import { sendTestEmail } from '@/ai/flows/send-test-email-flow';
import type { SentEmail, EmailLog } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EmailsPage() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [testEmail, setTestEmail] = useState('');

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [emailsData, logsData] = await Promise.all([
                fetchSentEmails(),
                fetchEmailLogs(),
            ]);
            setSentEmails(emailsData);
            setLogs(logsData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial y los logs.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSendTestEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmail) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, ingresa un correo de destino.' });
            return;
        }

        startTransition(async () => {
            toast({ title: 'Enviando correo de prueba...', description: `A: ${testEmail}` });
            const result = await sendTestEmail({ to: testEmail });
            if (result.success) {
                toast({ title: '¡Éxito!', description: 'El correo de prueba fue enviado correctamente. Revisa la bandeja de entrada y los logs.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el correo. Revisa la configuración SMTP y los logs del servidor.' });
            }
            await loadData();
        });
    };
    
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm:ss');
    }

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Correos</CardTitle>
                    <CardDescription>Monitorea y prueba el envío de correos electrónicos del sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="history">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="history">Historial de Envíos</TabsTrigger>
                            <TabsTrigger value="logs">Logs del Servidor</TabsTrigger>
                            <TabsTrigger value="test">Prueba de Servidor</TabsTrigger>
                        </TabsList>
                        <TabsContent value="history" className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Destinatario</TableHead>
                                        <TableHead>Asunto</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : sentEmails.length > 0 ? (
                                        sentEmails.map((email) => (
                                            <TableRow key={email.id}>
                                                <TableCell>{email.to}</TableCell>
                                                <TableCell className="font-medium">{email.subject}</TableCell>
                                                <TableCell>{formatDate(email.sentAt)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={email.status === 'Enviado' ? 'secondary' : 'destructive'}>
                                                        {email.status === 'Enviado' ? <MailCheck className="mr-1 h-3 w-3" /> : <MailWarning className="mr-1 h-3 w-3" />}
                                                        {email.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                No hay correos en el historial.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="logs" className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Nivel</TableHead>
                                        <TableHead>Mensaje</TableHead>
                                        <TableHead>Flujo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : logs.length > 0 ? (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={log.level === 'ERROR' ? 'destructive' : 'secondary'}>
                                                        {log.level === 'ERROR' ? <AlertCircle className="mr-1 h-3 w-3" /> : <Info className="mr-1 h-3 w-3" />}
                                                        {log.level}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={cn("font-mono text-xs", log.level === 'ERROR' && 'text-destructive')}>{log.message}</TableCell>
                                                <TableCell className="text-muted-foreground">{log.flow}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                No hay logs para mostrar.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="test" className="pt-4">
                            <form onSubmit={handleSendTestEmail} className="max-w-md mx-auto space-y-4 text-center p-4 border rounded-lg">
                                <div>
                                    <h3 className="text-lg font-semibold">Probar Configuración SMTP</h3>
                                    <p className="text-sm text-muted-foreground">Envía un correo a una dirección para verificar que el servidor funciona.</p>
                                </div>
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="test-email">Correo de Destino</Label>
                                    <Input 
                                        id="test-email" 
                                        type="email" 
                                        placeholder="tu@email.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isPending}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isPending ? 'Enviando...' : 'Enviar Correo de Prueba'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </AuthGuard>
    );
}
