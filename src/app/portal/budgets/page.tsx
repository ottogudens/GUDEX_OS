
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { FileText, CheckCircle, XCircle, Clock, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchBudgetsByCustomerId, updateBudgetStatus } from '@/lib/data';
import type { Budget } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function ClientBudgetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const loadBudgets = () => {
    if (!user?.id) return;
    startTransition(async () => {
      try {
        const fetchedBudgets = await fetchBudgetsByCustomerId(user.id);
        setBudgets(fetchedBudgets);
      } catch (error) {
        console.error("Error fetching budgets:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar tus presupuestos.',
        });
      }
    });
  };

  useEffect(() => {
    loadBudgets();
  }, [user]);

  const handleApprove = async (budgetId: string) => {
    try {
      await updateBudgetStatus(budgetId, 'Aprobado');
      toast({
        title: 'Presupuesto Aprobado',
        description: 'Hemos notificado al taller. Pronto se pondrán en contacto contigo.',
      });
      loadBudgets();
    } catch (error) {
      console.error("Error approving budget:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo aprobar el presupuesto.',
      });
    }
  };

  const getStatusInfo = (status: Budget['status']) => {
    switch (status) {
      case 'Aprobado':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          text: 'Aprobado',
          variant: 'secondary',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'Rechazado':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          text: 'Rechazado',
          variant: 'destructive',
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'Pendiente':
      default:
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          text: 'Pendiente de Aprobación',
          variant: 'default',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
    }
  };

  return (
    <AuthGuard allowedRoles={['Cliente']}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold">Mis Presupuestos</h1>
                <p className="text-muted-foreground">Consulta, aprueba o rechaza las cotizaciones de servicios.</p>
            </div>
            <Button asChild>
                <Link href="/portal/budgets/request">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Solicitar Nuevo Presupuesto
                </Link>
            </Button>
        </div>
        
        <Separator />

        {isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : budgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {budgets.map((budget) => {
                    const statusInfo = getStatusInfo(budget.status);
                    return (
                        <Card key={budget.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{budget.vehicleIdentifier}</span>
                                    <Badge variant={statusInfo.variant} className={cn("text-xs", statusInfo.className)}>
                                        {statusInfo.icon}
                                        <span className="ml-1">{statusInfo.text}</span>
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Emitido el {format(parseISO(budget.createdAt.toDate().toISOString()), 'd MMMM, yyyy', { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <ul className="space-y-2 text-sm">
                                {budget.items.map((item, index) => (
                                    <li key={index} className="flex justify-between">
                                        <span>{item.description} (x{item.quantity})</span>
                                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                    </li>
                                ))}
                                </ul>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(budget.total)}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/50 p-4">
                                {budget.status === 'Pendiente' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full">Aprobar Presupuesto</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se aprobará el presupuesto para "{budget.vehicleIdentifier}" por un total de {formatCurrency(budget.total)}. Un asesor se pondrá en contacto para coordinar el servicio.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleApprove(budget.id)}>Confirmar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Sin Presupuestos</h2>
                <p className="mt-2 text-muted-foreground">Aún no tienes presupuestos generados. Cuando solicites uno, aparecerá aquí.</p>
            </div>
        )}
      </div>
    </AuthGuard>
  );
}
