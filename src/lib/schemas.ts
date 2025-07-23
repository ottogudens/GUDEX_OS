
import * as z from 'zod';

export const VehicleSchema = z.object({
  customerId: z.string().min(1, 'Se requiere un cliente.'),
  licensePlate: z.string().min(1, 'La patente es obligatoria.'),
  make: z.string().min(1, 'La marca es obligatoria.'),
  model: z.string().min(1, 'El modelo es obligatorio.'),
  year: z.number().int().min(1900, 'Año inválido.').max(new Date().getFullYear() + 1, 'Año inválido.'),
  engineDisplacement: z.string().min(1, 'La cilindrada es obligatoria.'),
  fuelType: z.enum(['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido', 'Otro']),
  transmissionType: z.enum(['Manual', 'Automática']),
  vin: z.string().optional(),
  imageUrl: z.string().url().optional(),
  engineNumber: z.string().optional(),
  color: z.string().optional(),
  oilFilter: z.string().optional(),
  airFilter: z.string().optional(),
  fuelFilter: z.string().optional(),
  pollenFilter: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof VehicleSchema>;

export const WorkOrderSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio.'),
  description: z.string().min(1, 'La descripción es obligatoria.'),
  customerId: z.string().min(1, 'El cliente es obligatorio.'),
  customer: z.string(),
  vehicleId: z.string().min(1, 'El vehículo es obligatorio.'),
  vehicle: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().min(1, 'La cantidad debe ser al menos 1.'),
    price: z.number(),
    itemType: z.enum(['product', 'service']),
  })).min(1, 'Debe haber al menos un ítem en la orden.'),
});

export type WorkOrderFormData = z.infer<typeof WorkOrderSchema>;

export const ServiceSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio.'),
    category: z.string().min(1, 'La categoría es obligatoria.'),
    subcategory: z.string().optional(),
    price: z.number().min(0, 'El precio no puede ser negativo.'),
    availableInPOS: z.boolean(),
});

export const ProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  brand: z.string().optional(),
  salePrice: z.number().min(0, 'El precio de venta no puede ser negativo.'),
  purchasePrice: z.number().min(0, 'El precio de compra no puede ser negativo.').optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo.'),
  barcode: z.string().optional(),
  category: z.string().min(1, 'La categoría es obligatoria.'),
  subcategory: z.string().optional(),
  imageUrl: z.string().url().optional(),
  visibleInPOS: z.boolean(),
});

export type ProductFormData = z.infer<typeof ProductSchema>;

export const StockUpdateSchema = z.object({
  newStock: z.number().int().min(0, 'El stock no puede ser negativo.'),
});

export const ProviderSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    taxId: z.string().min(1, "El RUT o ID es obligatorio."),
    address: z.string().min(1, "La dirección es obligatoria."),
    phone: z.string().min(1, "El teléfono es obligatorio."),
    email: z.string().email("Email inválido."),
    bank: z.string().min(1, "El banco es obligatorio."),
    accountNumber: z.string().min(1, "El número de cuenta es obligatorio."),
    paymentTerms: z.string().min(1, "Los plazos de pago son obligatorios."),
    discounts: z.string().optional(),
    representativeName: z.string().optional(),
    representativeEmail: z.string().email("Email de representante inválido.").optional().or(z.literal('')),
    representativePhone: z.string().optional(),
});

export type ProviderFormData = z.infer<typeof ProviderSchema>;
