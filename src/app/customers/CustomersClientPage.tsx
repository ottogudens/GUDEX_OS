
'use client';

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
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { AddCustomerButton } from '@/components/AddCustomerButton';
import { EditCustomerButton } from '@/components/EditCustomerButton';
import { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { fetchCustomersAction, deleteCustomerAction } from './actions';

interface CustomersClientPageProps {
  initialCustomers: Customer[];
}

export function CustomersClientPage({ initialCustomers }: CustomersClientPageProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [loading, setLoading] = useState(false); // La carga inicial ya no es necesaria
  const [isPending, startTransition] = useTransition();
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomersAction();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron recargar los clientes.' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (!customerToDelete) return;

    startTransition(async () => {
      const result = await deleteCustomerAction(customerToDelete.id);
      if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        setCustomerToDelete(null);
        await loadCustomers(); // Recargar la lista tras eliminar
      } else {
        toast({ variant: 'destructive', title: 'Error al eliminar', description: result.message });
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestiona tu base de datos de clientes.</CardDescription>
          </div>
          <AddCustomerButton onSuccess={loadCustomers} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-center">Vehículos</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="font-normal text-foreground">
                        {customer.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.vehicleCount}
                    </TableCell>
                    <TableCell>{customer.lastVisit}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>Ver Detalles</Link>
                          </DropdownMenuItem>
                          {user?.role === 'Administrador' && (
                            <>
                              <EditCustomerButton customer={customer} onSuccess={loadCustomers} />
                              <DropdownMenuSeparator />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                        className={cn("text-destructive focus:text-destructive", customer.vehicleCount > 0 && "cursor-not-allowed")}
                                        disabled={customer.vehicleCount > 0}
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            if (customer.vehicleCount === 0) {
                                                setCustomerToDelete(customer);
                                            }
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  {customer.vehicleCount > 0 && (
                                    <TooltipContent>
                                      <p>No se puede eliminar clientes con vehículos.</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará el perfil de "{customerToDelete?.name}" de la base de datos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                    {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
