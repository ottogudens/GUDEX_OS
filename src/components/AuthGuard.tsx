'use client';

import { useAuth, User } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Skeleton } from './ui/skeleton';

type AllowedRoles = User['role'][];

export function AuthGuard({ children, allowedRoles }: { children: ReactNode, allowedRoles: AllowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; 
    }
    if (!isAuthenticated) {
      // Default to the client login for any unauthenticated access to a protected route.
      router.push('/portal/login');
      return;
    }
    if (user && !allowedRoles.includes(user.role)) {
        if (user.role === 'Cliente') {
            router.push('/portal/dashboard');
        } else {
            router.push('/');
        }
    }
  }, [user, loading, isAuthenticated, router, allowedRoles]);

  if (loading || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
    return (
      <div className="flex h-[calc(100vh-150px)] w-full items-center justify-center">
        <div className="space-y-4 text-center">
            <p className="text-muted-foreground">Verificando acceso...</p>
            <Skeleton className="h-8 w-[300px] mx-auto" />
            <Skeleton className="h-24 w-[300px] mx-auto" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
