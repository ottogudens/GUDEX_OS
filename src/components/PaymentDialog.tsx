
"use client";

import React, { useState, useMemo, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X, PlusCircle, Printer, Loader2 } from 'lucide-react';
import type { CartItem, Payment, PaymentMethod, Customer, Sale, WorkshopSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createSale, saveReceipt } from '@/lib/mutations';
import { useSettings } from '@/context/SettingsContext';
import { sendReceiptEmail } from '@/ai/flows/send-receipt-email-flow';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    autoPrint: () => jsPDF;
  }
}

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  customer: Customer | null | undefined;
  workOrderId: string | null;
  cashRegisterSessionId: string | null;
  onSuccess: () => void;
}

export function PaymentDialog({ isOpen, onClose, cart, total, customer, workOrderId, cashRegisterSessionId, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isPending, startTransition] = useTransition();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Discount input state
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // State for the applied discount
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'fixed' | 'percentage'; value: number; amount: number; } | null>(null);


  const [saleCompleted, setSaleCompleted] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const subtotal = total;

  const finalTotal = useMemo(() => {
    const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
    return subtotal - discountAmount;
  }, [subtotal, appliedDiscount]);

  const paidAmount = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const remainingAmount = useMemo(() => finalTotal - paidAmount, [finalTotal, paidAmount]);

  React.useEffect(() => {
    if (isOpen) {
        setPayments([]);
        setSaleCompleted(false);
        setCompletedSaleId(null);
        setDiscountType('fixed');
        setDiscountValue(0);
        setAppliedDiscount(null);
        setEmailStatus('idle');
    }
  }, [isOpen]);
  
  React.useEffect(() => {
    setPaymentAmount(remainingAmount > 0 ? remainingAmount : 0);
  }, [remainingAmount]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const handleApplyDiscount = () => {
    if (discountValue <= 0) {
      toast({ variant: 'destructive', title: 'Valor de descuento inválido', description: 'El descuento debe ser un número positivo.' });
      return;
    }

    let amountToApply = 0;
    if (discountType === 'percentage') {
      if (discountValue > 100) {
        toast({ variant: 'destructive', title: 'Porcentaje inválido', description: 'El porcentaje no puede ser mayor a 100.' });
        return;
      }
      amountToApply = (subtotal * discountValue) / 100;
    } else {
      amountToApply = Math.min(subtotal, discountValue);
    }
    
    setAppliedDiscount({
      type: discountType,
      value: discountValue,
      amount: amountToApply
    });
    setPayments([]); // Reset payments when discount changes
    toast({ title: 'Descuento Aplicado', description: `Se aplicó un descuento de ${formatCurrency(amountToApply)}.` });
  };
  
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountValue(0);
    setDiscountType('fixed');
    setPayments([]); // Reset payments when discount changes
    toast({ title: 'Descuento Eliminado' });
  };

  const handleAddPayment = () => {
    if (paymentAmount <= 0) {
      toast({ variant: 'destructive', title: 'Monto inválido', description: 'El monto a pagar debe ser mayor a cero.' });
      return;
    }
    if (paymentAmount > remainingAmount + 0.01) {
      toast({ variant: 'destructive', title: 'Monto excede el total', description: `No puedes pagar más de lo que resta (${formatCurrency(remainingAmount)}).` });
      return;
    }

    setPayments(prev => [...prev, { method: paymentMethod, amount: paymentAmount }]);
    const newRemaining = remainingAmount - paymentAmount;
    setPaymentAmount(newRemaining > 0 ? newRemaining : 0);
  };

  const handleRemovePayment = (index: number) => {
    const newPayments = payments.filter((_, i) => i !== index);
    setPayments(newPayments);
  };

  const addA4PdfContent = (doc: jsPDF, saleId: string) => {
    if (settings.logoUrl && (settings.logoUrl.startsWith('data:image') || settings.logoUrl.startsWith('http'))) {
        try {
            const img = new Image();
            img.src = settings.logoUrl;
            const logoWidth = 45;
            const logoHeight = (img.height * logoWidth) / img.width;
            doc.addImage(img, 'PNG', 14, 15, logoWidth, logoHeight);
        } catch (e) {
             doc.setFontSize(18);
             doc.text(settings.name, 14, 22);
        }
    } else {
         doc.setFontSize(18);
         doc.text(settings.name, 14, 22);
    }
    doc.setFontSize(10);
    doc.text(settings.address, 14, 35);
    doc.text(`RUT: ${settings.rut}`, 14, 40);
    doc.text(`Teléfono: ${settings.phone}`, 14, 45);

    doc.setFontSize(12);
    doc.text(`BOLETA DE VENTA #${saleId.slice(-6).toUpperCase()}`, 200, 22, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 200, 28, { align: 'right' });

    doc.text('Cliente:', 14, 60);
    doc.text(customer?.name || 'Cliente Varios', 14, 65);
    if (customer && customer.id !== 'general' && customer.email) {
        doc.text(customer.email, 14, 70);
    }
    
    (doc as any).autoTable({
        startY: 75,
        head: [['Ítem', 'Cant.', 'P. Unitario', 'Subtotal']],
        body: cart.map(item => [item.name, item.quantity.toString(), formatCurrency(item.price), formatCurrency(item.price * item.quantity)]),
        theme: 'striped',
        headStyles: { fillColor: [22, 22, 22] },
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(12);
    doc.text('Subtotal:', 150, finalY + 8, { align: 'right' });
    doc.text(formatCurrency(subtotal), 200, finalY + 8, { align: 'right' });
    
    if (appliedDiscount && appliedDiscount.amount > 0) {
        finalY += 6;
        doc.text(`Descuento (${appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : 'Fijo'}):`, 150, finalY + 8, { align: 'right' });
        doc.text(`- ${formatCurrency(appliedDiscount.amount)}`, 200, finalY + 8, { align: 'right' });
    }

    doc.setFontSize(14);
    doc.text('TOTAL:', 150, finalY + 15, { align: 'right' });
    doc.text(formatCurrency(finalTotal), 200, finalY + 15, { align: 'right' });
    
    finalY += 15;

    doc.setFontSize(10);
    doc.text('Pagos Realizados:', 14, finalY + 10);
    (doc as any).autoTable({
        startY: finalY + 13,
        head: [['Medio de Pago', 'Monto']],
        body: payments.map(p => [p.method, formatCurrency(p.amount)]),
        theme: 'grid',
    });
    
    finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text('¡Gracias por su compra!', 105, finalY + 20, { align: 'center' });
  }

  const generateA4ReceiptAsBase64 = (saleId: string): string => {
    const doc = new jsPDF();
    addA4PdfContent(doc, saleId); 
    return doc.output('datauristring').split(',')[1];
  };
  
  const generateThermalReceiptPDF = (saleId: string) => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 297]
    });
    
    const margin = 5;
    const center = 40;
    const width = 70;
    let y = 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.name, center, y, { align: 'center' });
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.address, center, y, { align: 'center', maxWidth: width });
    y += 8;
    doc.text(`RUT: ${settings.rut}`, center, y, { align: 'center' });
    y += 4;
    doc.text(`Tel: ${settings.phone}`, center, y, { align: 'center' });
    y += 8;

    doc.text(`Boleta de Venta: #${saleId.slice(-6).toUpperCase()}`, margin, y);
    y += 4;
    doc.text(`Fecha: ${new Date().toLocaleString('es-CL')}`, margin, y);
    y += 4;
    doc.text(`Cliente: ${customer?.name || 'Cliente Varios'}`, margin, y);
    y += 6;

    doc.text('------------------------------------------------', center, y, { align: 'center' });
    y += 4;
    
    doc.setFontSize(8);
    cart.forEach(item => {
      const itemText = `${item.quantity}x ${item.name}`;
      const itemPrice = formatCurrency(item.price * item.quantity);
      doc.text(itemText, margin, y, { maxWidth: width - 20 });
      doc.text(itemPrice, 75, y, { align: 'right' });
      y += 4;
    });

    doc.text('------------------------------------------------', center, y, { align: 'center' });
    y += 4;

    doc.setFontSize(8);
    doc.text('Subtotal:', margin, y);
    doc.text(formatCurrency(subtotal), 75, y, { align: 'right' });
    y += 4;

    if (appliedDiscount && appliedDiscount.amount > 0) {
        doc.text('Descuento:', margin, y);
        doc.text(`- ${formatCurrency(appliedDiscount.amount)}`, 75, y, { align: 'right' });
        y += 4;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', margin, y);
    doc.text(formatCurrency(finalTotal), 75, y, { align: 'right' });
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    payments.forEach(p => {
        doc.text(`Pagado con ${p.method}:`, margin, y);
        doc.text(formatCurrency(p.amount), 75, y, { align: 'right' });
        y += 4;
    });

    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('¡Gracias por su compra!', center, y, { align: 'center' });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleFinalizeSale = () => {
    if (!cashRegisterSessionId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay una sesión de caja activa. No se puede registrar la venta.' });
        return;
    }
    if (remainingAmount > 0.01) {
      toast({ variant: 'destructive', title: 'Pago incompleto', description: `Aún falta por pagar ${formatCurrency(remainingAmount)}.` });
      return;
    }
    
    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
        customerId: customer?.id === 'general' ? null : customer?.id || null,
        customerName: customer?.name || 'Cliente Varios',
        workOrderId,
        items: cart.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, price: c.price, itemType: c.itemType })),
        subtotal,
        total: finalTotal,
        payments,
        cashRegisterSessionId,
        ...(appliedDiscount && appliedDiscount.amount > 0 && {
            discount: {
                type: appliedDiscount.type,
                value: appliedDiscount.value,
                amount: appliedDiscount.amount,
            }
        })
    };
    
    startTransition(async () => {
        try {
            const saleId = await createSale(saleData);
            setCompletedSaleId(saleId);
            setSaleCompleted(true);
            
            const pdfBase64 = generateA4ReceiptAsBase64(saleId);
            await saveReceipt(saleId, pdfBase64, customer?.id || null, customer?.name || 'Cliente Varios');
            
            if (customer && customer.id !== 'general' && customer.email) {
                setEmailStatus('sending');
                const emailResult = await sendReceiptEmail({
                    customerName: customer.name,
                    customerEmail: customer.email,
                    saleId: saleId,
                    receiptPdfAsBase64: pdfBase64,
                });
                setEmailStatus(emailResult.success ? 'sent' : 'error');
            }

        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error al registrar la venta', description: error.message });
        }
    });
  };

  const handlePrint = () => {
    if (completedSaleId) {
        generateThermalReceiptPDF(completedSaleId);
    }
  };

  if (saleCompleted) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onSuccess()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Venta Finalizada con Éxito</DialogTitle>
                <DialogDescription>
                    La venta #{completedSaleId?.slice(-6).toUpperCase()} ha sido registrada.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
                <p>¿Qué deseas hacer a continuación?</p>
                {emailStatus === 'sending' && <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-2"><Loader2 className="animate-spin" /> Enviando correo...</p>}
                {emailStatus === 'sent' && <p className="text-sm text-green-500 mt-2">Comprobante enviado por correo electrónico.</p>}
                {emailStatus === 'error' && <p className="text-sm text-destructive mt-2">Error al enviar el correo.</p>}
            </div>
            <DialogFooter className="sm:justify-center">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Boleta (80mm)
                </Button>
                <Button onClick={onSuccess}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Finalizar Venta</DialogTitle>
          <DialogDescription>Gestiona el pago para completar la transacción.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4">
          <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2">Descuento (Opcional)</h3>
                <div className="flex items-end gap-2">
                    <div className="grid gap-1.5 flex-1">
                        <Label htmlFor="discountType">Tipo</Label>
                        <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)} disabled={!!appliedDiscount}>
                            <SelectTrigger id="discountType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5 flex-1">
                        <Label htmlFor="discountValue">Valor</Label>
                        <Input
                            id="discountValue"
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                            placeholder="0"
                            min="0"
                            disabled={!!appliedDiscount}
                        />
                    </div>
                     {appliedDiscount ? (
                        <Button type="button" variant="destructive" onClick={handleRemoveDiscount}>Quitar</Button>
                    ) : (
                        <Button type="button" onClick={handleApplyDiscount}>Aplicar</Button>
                    )}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-2">Medios de Pago</h3>
                <div className="flex items-end gap-2 mb-4">
                <div className="flex-1">
                    <Label htmlFor="paymentMethod">Medio de Pago</Label>
                    <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}>
                        <SelectTrigger id="paymentMethod">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <Label htmlFor="paymentAmount">Monto</Label>
                    <Input 
                        id="paymentAmount" 
                        type="number" 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    />
                </div>
                <Button onClick={handleAddPayment} size="icon" type="button"><PlusCircle /></Button>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medio</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Sin pagos añadidos</TableCell></TableRow>
                            ) : (
                                payments.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{p.method}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePayment(i)}><X className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </div>
          <div className="space-y-4">
              <h3 className="font-semibold">Resumen</h3>
              <div className="border rounded-lg p-4 space-y-2 text-lg">
                  <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {appliedDiscount && appliedDiscount.amount > 0 && (
                      <div className="flex justify-between text-destructive">
                          <span>Descuento ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : 'Fijo'}):</span>
                          <span>- {formatCurrency(appliedDiscount.amount)}</span>
                      </div>
                  )}
                  <div className="flex justify-between font-bold text-xl pt-2 border-t">
                      <span>TOTAL A PAGAR:</span>
                      <span>{formatCurrency(finalTotal)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                      <span>Total Pagado:</span>
                      <span className="font-bold text-green-500">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-primary">
                      <span>RESTA:</span>
                      <span>{formatCurrency(remainingAmount)}</span>
                  </div>
              </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleFinalizeSale} disabled={remainingAmount > 0.01 || isPending}>
            {isPending ? 'Procesando...' : 'Finalizar Venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
