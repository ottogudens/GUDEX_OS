"use client";

import { useState } from 'react';
import Link from 'next/link';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { createUserProfile } from '@/lib/data';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const auth = getAuth(app);
    const { toast } = useToast();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast({ variant: "destructive", title: "El nombre es requerido." });
            return;
        }
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Create the user profile and customer entry in Firestore
            await createUserProfile(userCredential.user.uid, name, email, phone);
            
            // The AuthContext onAuthStateChanged listener will now pick up the new user,
            // find their created profile, and handle redirection.
            toast({
                title: '¡Registro Exitoso!',
                description: 'Bienvenido/a. Redirigiendo a tu panel...',
            });
        } catch (error: any) {
            console.error("Registration Error:", error);
            let message = 'No se pudo crear la cuenta. Verifica que los datos sean correctos.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        message = 'El correo electrónico ya está en uso. Por favor, inicia sesión.';
                        break;
                    case 'auth/weak-password':
                        message = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
                        break;
                    case 'auth/invalid-email':
                        message = 'El formato del correo electrónico no es válido.';
                        break;
                    default:
                         message = `Ocurrió un error inesperado: ${error.message}`;
                }
            } else if (error instanceof Error) {
                message = "Se creó tu cuenta, pero no se pudo crear tu perfil de cliente. Por favor, contacta a soporte.";
            }

            toast({
                variant: "destructive",
                title: "Error de Registro",
                description: message,
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
                    <CardTitle>Crear una Cuenta de Cliente</CardTitle>
                    <CardDescription>Regístrate para gestionar tus vehículos y citas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                placeholder="ej. Juan Pérez"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
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
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="ej. 9 1234 5678"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                placeholder="6+ caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Creando cuenta...' : 'Registrarme'}
                        </Button>
                         <div className="mt-4 text-center text-sm">
                            ¿Ya tienes una cuenta?{" "}
                            <Link href="/portal/login" className="underline hover:text-primary">
                                Inicia Sesión
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
