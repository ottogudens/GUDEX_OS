
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createSale } from '@/lib/mutations';
import type { CartItem, Customer, Payment, PaymentMethod } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  customer: Customer | null;
  workOrderId: string | null;
  cashRegisterSessionId: string | null;
  onSuccess: () => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  cart,
  total,
  customer,
  workOrderId,
  cashRegisterSessionId,
  onSuccess,
}: PaymentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([{ method: 'Efectivo', amount: total }]);

  const handlePayment = () => {
    startTransition(async () => {
      if (!cashRegisterSessionId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay una sesión de caja activa.' });
        return;
      }
      
      const saleData = {
        customerId: customer?.id || null,
        customerName: customer?.name || 'Cliente Varios',
        workOrderId,
        cashRegisterSessionId,
        items: cart,
        subtotal: total,
        total,
        payments,
      };

      const result = await createSale(saleData);

      if (result.success) {
        onSuccess();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message || 'No se pudo registrar la venta.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>Total a pagar: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)}</DialogDescription>
        </DialogHeader>
        
        {/* Payment options can be added here */}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePayment} disabled={isPending}>
            {isPending ? 'Procesando...' : 'Confirmar Venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
