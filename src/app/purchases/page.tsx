
'use client';

import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPurchaseInvoices, fetchProviders } from '@/lib/data'; // fetchPurchaseInvoices needs to be created
import type { PurchaseInvoice, Provider } from '@/lib/types'; // PurchaseInvoice type needs to be created

export default function PurchasesDashboard() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [invoicesData, providersData] = await Promise.all([
          fetchPurchaseInvoices(),
          fetchProviders(),
        ]);
        setInvoices(invoicesData);
        setProviders(providersData);
      } catch (error) {
        console.error("Failed to fetch purchases data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  const summary = {
    accountsPayable: invoices.filter(inv => inv.status === 'Pendiente').reduce((acc, inv) => acc + inv.totalAmount, 0),
    activeProviders: providers.length,
    purchasesThisMonth: invoices
        .filter(inv => new Date(inv.date).getMonth() === new Date().getMonth())
        .reduce((acc, inv) => acc + inv.totalAmount, 0),
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };
  
  const getProviderName = (providerId: string) => {
      const provider = providers.find(p => p.id === providerId);
      return provider ? provider.name : 'N/A';
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel de Compras</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas por Pagar</CardTitle>
            <CardDescription>Total de facturas pendientes de pago.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.accountsPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proveedores Activos</CardTitle>
            <CardDescription>Total de proveedores registrados.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.activeProviders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compras del Mes</CardTitle>
            <CardDescription>Total gastado en compras este mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.purchasesThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturas de Compra Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.slice(0, 5).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{getProviderName(invoice.providerId)}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={
                        invoice.status === 'Pagada' ? 'default' : 
                        invoice.status === 'Pendiente' ? 'secondary' : 'destructive'
                    }>
                        {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
