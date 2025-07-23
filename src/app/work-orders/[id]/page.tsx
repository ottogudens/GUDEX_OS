
"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WorkOrder } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AuthGuard } from '@/components/AuthGuard';

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id !== 'string') return;

    const fetchWorkOrder = async () => {
      try {
        const docRef = doc(db, 'workOrders', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setWorkOrder({ id: docSnap.id, ...docSnap.data() } as WorkOrder);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching work order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return notFound();
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">{workOrder.title}</h1>
          <p className="text-muted-foreground">Orden de Trabajo #{workOrder.code}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div><strong>Cliente:</strong> {workOrder.customer}</div>
            <div><strong>Vehículo:</strong> {workOrder.vehicle}</div>
            <div><strong>Asignado a:</strong> {workOrder.assignedTo}</div>
            <div><strong>Estado:</strong> <Badge>{workOrder.status}</Badge></div>
            <div><strong>Fecha de Creación:</strong> {format(workOrder.createdAt.toDate(), 'PPPp', { locale: es })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descripción del Problema</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{workOrder.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ítems y Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right font-bold text-xl mt-4">
              Total: {formatCurrency(workOrder.total)}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
