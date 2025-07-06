"use client";

import { useState } from 'react';
import Link from 'next/link';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { ArrowLeft } from 'lucide-react';


export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const auth = getAuth(app);
    const { toast } = useToast();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setIsSent(true);
        } catch (error: any) {
            console.error("Password Reset Error:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo enviar el correo. Verifica que el email sea correcto.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center space-y-4">
                     <Logo width={200} height={66} className="mx-auto" />
                    <CardTitle>Restablecer Contraseña</CardTitle>
                    <CardDescription>
                        {isSent 
                            ? "Revisa tu bandeja de entrada para continuar."
                            : "Ingresa tu correo para enviarte un enlace de restablecimiento."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSent ? (
                         <div className="text-center">
                            <p className="text-muted-foreground mb-4">
                                Si no encuentras el correo, revisa tu carpeta de spam.
                            </p>
                             <div className="mt-4 text-center text-sm">
                                Volver al {" "}
                                <Link href="/portal/login" className="underline hover:text-primary">
                                    Portal de Clientes
                                </Link>
                                {" "} o al {" "}
                                 <Link href="/login" className="underline hover:text-primary">
                                    Acceso de Sistema
                                </Link>
                            </div>
                         </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                            </Button>
                             <div className="mt-4 text-center text-sm">
                                ¿Recuperaste tu acceso? Vuelve a {" "}
                                <Link href="/portal/login" className="underline hover:text-primary">
                                    iniciar sesión
                                </Link>
                                .
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
