
'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { BudgetRequest } from '@/lib/types';

interface RequestActionsProps {
  request: BudgetRequest;
  // TODO: Conectar esta acción al diálogo principal para pre-rellenar los datos.
}

export function RequestActions({ request }: RequestActionsProps) {
  const handleCreateFromRequest = () => {
    // Esta lógica ahora debería vivir en la página principal (BudgetsPage)
    // para controlar el estado del diálogo de creación de presupuestos.
    // Por ahora, solo es un placeholder.
    console.log('Crear presupuesto desde la solicitud:', request.id);
    alert('Funcionalidad para crear presupuesto desde solicitud pendiente de conectar.');
  };

  return (
    <Button size="sm" onClick={handleCreateFromRequest}>
      <Sparkles className="mr-2 h-4 w-4" />
      Crear Presupuesto
    </Button>
  );
}
