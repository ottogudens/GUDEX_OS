
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PurchasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestión de Compras</h1>
      </div>
      
      <Tabs defaultValue="/purchases" className="w-full">
        <TabsList>
          <TabsTrigger value="/purchasi" asChild>
            <Link href="/purchases">Resumen</Link>
          </TabsTrigger>
          <TabsTrigger value="/purchases/invoices" asChild>
            <Link href="/purchases/invoices">Facturas</Link>
          </TabsTrigger>
          <TabsTrigger value="/purchases/providers" asChild>
            <Link href="/purchases/providers">Proveedores</Link>
          </TabsTrigger>
          <TabsTrigger value="/purchases/provider-payments" asChild>
            <Link href="/purchases/provider-payments">Pagos</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {children}
    </div>
  );
}
