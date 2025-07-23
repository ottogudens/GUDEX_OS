
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { ServiceCategory } from '@/lib/types';
import { fetchServiceCategories } from '@/lib/data';
import { createServiceCategory } from '@/lib/mutations';
// Create a component to render and manage categories maybe in a tree-like structure
// For now, let's just list them.

export default function CategoriesPage() {
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchServiceCategories();
            setCategories(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las categorías.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);
    
    // TODO: Implement category creation, editing, and deletion UI and logic.
    // For now, this is a placeholder page.

    return (
        <AuthGuard allowedRoles={['Administrador']}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Categorías de Servicios</CardTitle>
                        <CardDescription>
                            Gestiona las categorías y subcategorías para organizar tus servicios.
                        </CardDescription>
                    </div>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Categoría
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-40 w-full" />
                    ) : (
                        // Placeholder for category management UI
                        <div className="text-center py-10 text-muted-foreground">
                            La gestión de categorías estará disponible aquí.
                        </div>
                    )}
                </CardContent>
            </Card>
        </AuthGuard>
    )
}
