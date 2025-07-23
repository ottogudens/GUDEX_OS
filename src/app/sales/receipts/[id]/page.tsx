
"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Receipt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof id !== 'string') return;

    const fetchReceipt = async () => {
      try {
        const docRef = doc(db, 'receipts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReceipt({ id: docSnap.id, ...docSnap.data() } as Receipt);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [id]);

  const handleDownload = () => {
    if (receipt) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${receipt.pdfAsBase64}`;
      link.download = `recibo-${receipt.id}.pdf`;
      link.click();
    }
  };

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
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!receipt) {
    return notFound();
  }

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Recibo #{receipt.id.slice(-6).toUpperCase()}</CardTitle>
                <CardDescription>Cliente: {receipt.customerName}</CardDescription>
            </div>
            <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Descargar PDF</Button>
        </CardHeader>
        <CardContent>
            <iframe
                src={`data:application/pdf;base64,${receipt.pdfAsBase64}`}
                className="w-full h-[80vh] border rounded-md"
                title={`Recibo ${receipt.id}`}
            />
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
