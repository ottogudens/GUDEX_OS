
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchBudgetsAction } from './actions';
import { formatCurrency, getStatusVariant } from '@/lib/utils';
import { BudgetActions } from './BudgetActions';

/**
 * Este es un Componente de Servidor (RSC).
 * Obtiene los datos directamente en el servidor, por lo que es muy eficiente.
 */
export async function BudgetsTable() {
  // Obtenemos los datos en el servidor. No hay 'isLoading' aquí.
  const budgets = await fetchBudgetsAction();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead className="text-right">Monto Total</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {budgets.length > 0 ? (
          budgets.map((budget) => (
            <TableRow key={budget.id}>
              {/* @ts-ignore */}
              <TableCell className="font-medium">{budget.customer.name}</TableCell>
              <TableCell>{`${budget.vehicle.make} ${budget.vehicle.model}`}</TableCell>
              <TableCell className="text-right">{formatCurrency(budget.total)}</TableCell>
              <TableCell className="text-center">
                {/* @ts-ignore */}
                <Badge variant={getStatusVariant(budget.status)}>{budget.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {/* Extraemos las acciones a su propio componente cliente */}
                <BudgetActions budget={budget} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No hay presupuestos emitidos.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
