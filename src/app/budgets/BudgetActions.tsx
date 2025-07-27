
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteBudgetAction } from './actions';
import { EnrichedBudget } from './page'; // Reutilizamos el tipo por ahora
import { useSettings } from '@/context/SettingsContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

// Definimos la interfaz para autoTable aquí para evitar errores de TS
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface BudgetActionsProps {
  budget: EnrichedBudget; // Usamos el tipo enriquecido que ya teníamos
}

export function BudgetActions({ budget }: BudgetActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const deleteMutation = useMutation({
    mutationFn: () => deleteBudgetAction(budget.id),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        // En lugar de llamar a una función, invalidamos la query
        // para que React Query vuelva a obtener los datos frescos.
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    },
    onError: (error) =>
      toast({ variant: 'destructive', title: 'Error Inesperado', description: error.message }),
  });
  
  const generateBudgetPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(settings?.name || 'Presupuesto', 105, 22, { align: 'center' });
        doc.setFontSize(10);
        if(settings?.address) doc.text(settings.address, 105, 30, { align: 'center' });
        if(settings?.phone) doc.text(`Teléfono: ${settings.phone}`, 105, 36, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Presupuesto Para:', 14, 50);
        doc.setFontSize(10);
        doc.text(budget.customerName, 14, 56);
        doc.text(`Vehículo: ${budget.vehicleIdentifier}`, 14, 62);

        doc.setFontSize(12);
        doc.text(`Nº Presupuesto: #${budget.id.slice(0, 7).toUpperCase()}`, 200, 50, { align: 'right' });
        
        // @ts-ignore
        const date = budget.createdAt.toDate ? budget.createdAt.toDate() : new Date(budget.createdAt.seconds * 1000);
        doc.text(`Fecha: ${format(date, 'dd/MM/yyyy')}`, 200, 56, { align: 'right' });
        
        const body = budget.items.map(item => [
            item.description,
            item.quantity.toString(),
            formatCurrency(item.price),
            formatCurrency(item.price * item.quantity),
        ]);
        
        doc.autoTable({
            startY: 75,
            head: [['Descripción', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        const finalY = doc.autoTable.previous.finalY;
        doc.setFontSize(14);
        doc.text('Total:', 150, finalY + 15, { align: 'right' });
        doc.text(formatCurrency(budget.total), 200, finalY + 15, { align: 'right' });

        doc.save(`Presupuesto-${budget.id.slice(0, 7)}.pdf`);
    };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={generateBudgetPDF}>
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </DropdownMenuItem>
        <DropdownMenuItem disabled> {/* La edición se manejará desde el diálogo principal */}
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deleteMutation.mutate()}
          className="text-red-500"
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
