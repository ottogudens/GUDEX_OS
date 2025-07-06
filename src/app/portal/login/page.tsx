"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

export default function ClientLoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center space-y-4">
                    <Logo width={200} height={66} className="mx-auto" />
                    <CardTitle>Portal de Clientes</CardTitle>
                    <CardDescription>Accede a tu cuenta para ver tus vehículos y servicios.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
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
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                placeholder="Tu contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>
                         <div className="text-right text-sm">
                            <Link href="/forgot-password"
                                className="underline hover:text-primary">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Ingresando...' : 'Ingresar al Portal'}
                        </Button>
                    </form>
                    
                     <div className="mt-4 text-center text-sm">
                        ¿No tienes una cuenta?{" "}
                        <Link href="/register" className="underline hover:text-primary">
                            Regístrate
                        </Link>
                    </div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        ¿Eres administrador o mecánico?{" "}
                        <Link href="/login" className="underline hover:text-primary">
                            Ingresa aquí
                        </Link>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
