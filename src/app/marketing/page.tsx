
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';

const pastCampaigns: { id: string; subject: string; date: string; recipients: string; status: string }[] = [];

export default function MarketingPage() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [recipients, setRecipients] = useState('all');

    const handleSend = () => {
        if (!subject || !message) {
            toast({
                variant: 'destructive',
                title: 'Campos incompletos',
                description: 'Por favor, completa el asunto y el mensaje.',
            });
            return;
        }

        // En una aplicación real, aquí iría la lógica para enviar la campaña
        console.log('Sending campaign:', { subject, message, recipients });

        toast({
            title: '¡Promoción Enviada!',
            description: 'Tu campaña de marketing ha sido enviada con éxito.',
        });

        setSubject('');
        setMessage('');
        setRecipients('all');
    };

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader>
                    <CardTitle>Publicidad y Promociones</CardTitle>
                    <CardDescription>Crea y envía campañas de marketing a tus clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="create">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create">Crear Campaña</TabsTrigger>
                            <TabsTrigger value="history">Historial de Envíos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="create" className="pt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Asunto de la Campaña</Label>
                                    <Input 
                                        id="subject" 
                                        placeholder="Ej: ¡Oferta especial de verano!" 
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Mensaje de la Promoción</Label>
                                    <Textarea 
                                        id="message" 
                                        placeholder="Describe tu promoción aquí..." 
                                        rows={6}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="recipients">Destinatarios</Label>
                                    <Select value={recipients} onValueChange={setRecipients}>
                                        <SelectTrigger id="recipients">
                                            <SelectValue placeholder="Seleccionar audiencia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los clientes</SelectItem>
                                            <SelectItem value="active">Clientes activos (últimos 6 meses)</SelectItem>
                                            <SelectItem value="inactive">Clientes inactivos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleSend} className="w-full">
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Promoción
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="history" className="pt-4">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asunto</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastCampaigns.length > 0 ? (
                                        pastCampaigns.map((campaign) => (
                                            <TableRow key={campaign.id}>
                                                <TableCell className="font-medium">{campaign.subject}</TableCell>
                                                <TableCell>{campaign.date}</TableCell>
                                                <TableCell>
                                                     <Badge variant={campaign.status === 'Enviado' ? 'secondary' : 'default'}>
                                                        {campaign.status}
                                                     </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                No hay campañas en el historial.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </AuthGuard>
    );
}
