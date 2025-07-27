
import { z } from 'zod';

export const BudgetLineItemSchema = z.object({
  id: z.string().optional(), // Puede ser el ID de un producto o servicio existente
  description: z.string().min(1, "La descripción es obligatoria."),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.number().min(0, "El precio unitario no puede ser negativo."),
  itemType: z.enum(['product', 'service']).default('service'),
});

export const BudgetSchema = z.object({
  customerId: z.string().min(1, "El cliente es obligatorio."),
  vehicleId: z.string().min(1, "El vehículo es obligatorio."),
  status: z.enum(['pending', 'approved', 'rejected', 'expired']).default('pending'),
  
  items: z.array(BudgetLineItemSchema).min(1, "El presupuesto debe tener al menos un ítem."),
  
  notes: z.string().optional(),
  validUntil: z.date().optional(),
});

export type BudgetFormData = z.infer<typeof BudgetSchema>;
