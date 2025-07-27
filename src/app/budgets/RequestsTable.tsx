
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchBudgetRequestsAction } from './actions';
import { RequestActions } from './RequestActions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BudgetRequest } from '@/lib/types';

export async function RequestsTable() {
  const requests = await fetchBudgetRequestsAction();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length > 0 ? (
          requests.map((req: BudgetRequest) => (
            <TableRow key={req.id}>
              {/* @ts-ignore */}
              <TableCell className="font-medium">{req.customer?.name}</TableCell>
              {/* @ts-ignore */}
              <TableCell>{`${req.vehicle?.make} ${req.vehicle?.model}`}</TableCell>
              <TableCell className="max-w-xs truncate">{req.description}</TableCell>
              {/* @ts-ignore */}
              <TableCell>{format(req.createdAt.toDate(), 'P', { locale: es })}</TableCell>
              <TableCell className="text-right">
                <RequestActions request={req} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No hay solicitudes pendientes.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
