'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import type { User as AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { fetchUserById, createUserProfile } from '@/lib/data';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export type { AppUser as User };

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth(app);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        let appUser = await fetchUserById(firebaseUser.uid);
        
        if (!appUser && firebaseUser.email) {
          console.log("User not found in DB, creating profile...");
          const displayName = firebaseUser.displayName || firebaseUser.email!.split('@')[0];
          try {
            await createUserProfile(firebaseUser.uid, displayName, firebaseUser.email!);
            appUser = await fetchUserById(firebaseUser.uid);
          } catch(error) {
            console.error("Error auto-creating user profile in AuthContext:", error);
          }
        }
        
        setUser(appUser || null);

        const currentPath = window.location.pathname;
        const publicAuthPaths = ['/login', '/portal/login', '/register', '/forgot-password'];

        if (appUser && publicAuthPaths.includes(currentPath)) {
           toast({ title: 'Inicio de sesión exitoso', description: `Bienvenido, ${appUser.name}.` });
           if (appUser.role === 'Cliente') {
              router.push('/portal/dashboard');
           } else {
              router.push('/');
           }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);

      let description = 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
      if (error.code) {
          switch (error.code) {
              case 'auth/invalid-credential':
                  description = 'Las credenciales son incorrectas. Verifica tu correo y contraseña.';
                  break;
              case 'auth/user-disabled':
                  description = 'Esta cuenta de usuario ha sido deshabilitada.';
                  break;
              case 'auth/too-many-requests':
                  description = 'Acceso bloqueado temporalmente por demasiados intentos fallidos.';
                  break;
              default:
                   description = 'Error al iniciar sesión. Por favor, verifica tus datos.';
          }
      }

      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: description,
      });

      throw new Error("Authentication failed"); // To notify caller (login page) to stop loading
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
