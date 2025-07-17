
import { z } from 'zod';

export const BudgetItemSchema = z.object({
  description: z.string().min(1, 'La descripción no puede estar vacía.'),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1.'),
  price: z.number().min(0, 'El precio no puede ser negativo.'),
});

export const BudgetSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1, "Debes seleccionar un cliente."),
  vehicleId: z.string().min(1, "Debes seleccionar un vehículo."),
  items: z.array(BudgetItemSchema).min(1, "El presupuesto debe tener al menos un ítem."),
  total: z.number(),
  status: z.enum(['Pendiente', 'Aprobado', 'Rechazado']),
  createdById: z.string(),
  createdByName: z.string(),
  createdAt: z.any(),
});

export type Budget = z.infer<typeof BudgetSchema>;
