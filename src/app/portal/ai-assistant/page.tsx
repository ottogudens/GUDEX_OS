"use client";

import { useState, useEffect, useTransition, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { fetchVehiclesByCustomerId } from '@/lib/data';
import { askVehicleAssistant } from '@/ai/flows/vehicle-assistant-flow';
import type { Vehicle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type Message = {
    sender: 'user' | 'bot';
    text: string;
}

export default function AIAssistantPage() {
    const { user } = useAuth();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'bot', text: '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte con tu vehículo hoy? Puedes preguntarme sobre mantenciones, problemas comunes o agendar una cita.' }
    ]);
    const [input, setInput] = useState('');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [isBotReplying, startTransition] = useTransition();

    useEffect(() => {
        if (user?.id) {
            fetchVehiclesByCustomerId(user.id)
                .then(setVehicles)
                .finally(() => setLoadingVehicles(false));
        }
    }, [user]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = () => {
        if (input.trim() === '' || isBotReplying || loadingVehicles) return;
        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        startTransition(async () => {
            try {
                const vehicleDataForFlow = vehicles.map(v => ({
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    licensePlate: v.licensePlate,
                    vin: v.vin,
                    fuelType: v.fuelType,
                    engineDisplacement: v.engineDisplacement,
                }));

                const response = await askVehicleAssistant({
                    question: input,
                    vehicles: vehicleDataForFlow
                });
                
                const botMessage: Message = { sender: 'bot', text: response.answer };
                setMessages(prev => [...prev, botMessage]);

            } catch (error) {
                console.error("Error calling AI assistant:", error);
                const errorMessage: Message = { sender: 'bot', text: 'Lo siento, no pude procesar tu solicitud en este momento. Por favor, intenta de nuevo más tarde.' };
                setMessages(prev => [...prev, errorMessage]);
            }
        });
    };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Sparkles className="text-accent" />
                    Asistente Virtual IA
                </h1>
                <p className="text-muted-foreground">Tu experto personal para el cuidado de tu vehículo.</p>
            </div>
            
            <Card className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-16rem)]">
                <CardHeader>
                    <CardTitle>Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full pr-4" ref={scrollAreaRef as any}>
                        <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                {message.sender === 'bot' && (
                                    <Avatar className="w-8 h-8 bg-primary/10 text-primary flex-shrink-0">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${message.sender === 'bot' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                                {message.sender === 'user' && (
                                     <Avatar className="w-8 h-8 flex-shrink-0">
                                        <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         {isBotReplying && (
                            <div className="flex items-start gap-3">
                                <Avatar className="w-8 h-8 bg-primary/10 text-primary flex-shrink-0">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                                   <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                   <p className="text-sm text-muted-foreground">Pensando...</p>
                                </div>
                            </div>
                         )}
                         {loadingVehicles && (
                             <div className="flex items-start gap-3">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <Skeleton className="w-48 h-10 rounded-lg" />
                            </div>
                         )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="pt-4 border-t">
                    <div className="flex w-full items-center space-x-2">
                        <Input 
                            id="message" 
                            placeholder="Pregunta sobre tus vehículos..." 
                            className="flex-1" 
                            autoComplete="off"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isBotReplying || loadingVehicles}
                        />
                        <Button onClick={handleSend} disabled={!input.trim() || isBotReplying || loadingVehicles}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar</span>
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    </AuthGuard>
  );
}
