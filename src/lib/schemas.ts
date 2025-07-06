import { z } from 'zod';

// Schema for Customer
export const CustomerSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  email: z.string().email({ message: "Por favor, introduce un correo válido." }),
  phone: z.string().min(1, { message: "El teléfono es requerido." }),
});
export type CustomerFormData = z.infer<typeof CustomerSchema>;

// Schema for Product
export const ProductSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  brand: z.string().optional(),
  salePrice: z.coerce.number().min(0, { message: "El precio de venta no puede ser negativo." }),
  purchasePrice: z.coerce.number().min(0, { message: "El precio de compra no puede ser negativo." }).optional(),
  stock: z.coerce.number().int().min(0, { message: "El stock no puede ser negativo." }),
  barcode: z.string().optional(),
  category: z.string().min(1, { message: "La categoría es requerida." }),
  subcategory: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  visibleInPOS: z.boolean().default(false),
});
export type ProductFormData = z.infer<typeof ProductSchema>;

// Schema for updating stock
export const StockUpdateSchema = z.object({
  newStock: z.coerce.number().int().min(0, { message: "El stock no puede ser negativo." }),
});

// Schema for Service
export const ServiceSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  category: z.string().min(1, { message: "La categoría es requerida." }),
  subcategory: z.string().optional(),
  price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }),
  availableInPOS: z.boolean().default(false),
});
export type ServiceFormData = z.infer<typeof ServiceSchema>;

// Schema for ServiceCategory
export const ServiceCategorySchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  availableInPOS: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
});
export type ServiceCategoryFormData = z.infer<typeof ServiceCategorySchema>;

// Schema for ProductCategory
export const ProductCategorySchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  visibleInPOS: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
});
export type ProductCategoryFormData = z.infer<typeof ProductCategorySchema>;

// Schema for Workshop Settings
export const WorkshopSettingsSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  rut: z.string().min(1, "El RUT es requerido."),
  address: z.string().min(1, "La dirección es requerida."),
  phone: z.string().min(1, "El teléfono es requerido."),
  whatsapp: z.string().optional(),
  facebook: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  instagram: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});
export type WorkshopSettingsFormData = z.infer<typeof WorkshopSettingsSchema>;

// Schema for adding a new user
export const AddUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  email: z.string().email("El correo no es válido."),
  role: z.enum(['Administrador', 'Mecanico', 'Cliente'], {
    errorMap: () => ({ message: "Debes seleccionar un rol." })
  }),
});
export type AddUserFormData = z.infer<typeof AddUserSchema>;

// Schema for Camera
export const CameraSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  rtspUrl: z.string().min(1, { message: "La URL RTSP es requerida." }),
});
export type CameraFormData = z.infer<typeof CameraSchema>;

// Schema for Email Settings
export const EmailSettingsSchema = z.object({
  host: z.string().min(1, "El host es requerido."),
  port: z.coerce.number().int().min(1, "El puerto debe ser un número positivo."),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email("El correo remitente debe ser un email válido."),
  secure: z.boolean().default(true),
});
export type EmailSettingsFormData = z.infer<typeof EmailSettingsSchema>;

// Schema for Work Orders
export const WorkOrderSchema = z.object({
  title: z.string().min(1, { message: "El título es requerido." }),
  description: z.string().min(1, { message: "La descripción es requerida." }),
  customer: z.string().min(1, { message: "El nombre del cliente es requerido." }),
  customerId: z.string().min(1, { message: "Se requiere el ID del cliente." }),
  vehicle: z.string().min(1, { message: "El vehículo es requerido." }),
  vehicleId: z.string().min(1, { message: "Se requiere el ID del vehículo." }),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.coerce.number().int().min(1, { message: "La cantidad debe ser al menos 1."}),
    price: z.number(),
    itemType: z.enum(['product', 'service']),
  })).min(1, { message: "Debe agregar al menos un ítem a la orden." }),
  assignedTo: z.string().optional().default('??'),
});
export type WorkOrderFormData = z.infer<typeof WorkOrderSchema>;

// Schema for Vehicle
export const VehicleSchema = z.object({
  customerId: z.string().min(1, "Se debe seleccionar un cliente."),
  licensePlate: z.string().min(1, "La patente es obligatoria."),
  make: z.string().min(1, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  year: z.coerce.number().min(1900, "Año inválido.").max(new Date().getFullYear() + 2, "Año inválido."),
  engineDisplacement: z.string().min(1, "La cilindrada es obligatoria."),
  fuelType: z.enum(['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido', 'Otro'], {
    errorMap: () => ({ message: "Debes seleccionar un tipo de combustible." })
  }),
  transmissionType: z.enum(['Manual', 'Automática'], {
    errorMap: () => ({ message: "Debes seleccionar un tipo de transmisión." })
  }),
  engineNumber: z.string().optional().default(''),
  vin: z.string().optional().default(''),
  color: z.string().optional().default(''),
  oilFilter: z.string().optional().default(''),
  airFilter: z.string().optional().default(''),
  fuelFilter: z.string().optional().default(''),
  pollenFilter: z.string().optional().default(''),
});
export type VehicleFormData = z.infer<typeof VehicleSchema>;

// Schema for Sale
export const SaleSchema = z.object({
  customerId: z.string().nullable(),
  customerName: z.string(),
  workOrderId: z.string().nullable(),
  cashRegisterSessionId: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
    itemType: z.enum(['product', 'service', 'work-order']),
  })),
  subtotal: z.number(),
  discount: z.object({
    type: z.enum(['percentage', 'fixed']),
    value: z.number(),
    amount: z.number(),
  }).optional(),
  total: z.number(),
  payments: z.array(z.object({
    method: z.enum(['Tarjeta', 'Efectivo', 'Transferencia']),
    amount: z.number(),
  })),
});
export type SaleFormData = z.infer<typeof SaleSchema>;

// Schema for Appointment Request
export const AppointmentRequestSchema = z.object({
    customerId: z.string(),
    customerName: z.string(),
    customerEmail: z.string().email(),
    vehicleId: z.string().min(1, "Debes seleccionar un vehículo."),
    vehicleDescription: z.string(),
    service: z.string().min(1, "Debes seleccionar un servicio."),
    notes: z.string().optional(),
    requestedDate: z.string().datetime({ message: "La fecha y hora son requeridas." }),
});
export type AppointmentRequestFormData = z.infer<typeof AppointmentRequestSchema>;

// Schema for Provider
export const ProviderSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  taxId: z.string().min(1, "El número de identificación es requerido."),
  address: z.string().min(1, "La dirección es requerida."),
  phone: z.string().min(1, "El teléfono es requerido."),
  email: z.string().email("Debe ser un correo electrónico válido."),
  bank: z.string().min(1, "El banco es requerido."),
  accountNumber: z.string().min(1, "El número de cuenta es requerido."),
  paymentTerms: z.string().min(1, "Las condiciones de pago son requeridas."),
  discounts: z.string().optional(),
  representativeName: z.string().optional(),
  representativeEmail: z.string().email("Debe ser un correo electrónico válido.").optional().or(z.literal('')),
  representativePhone: z.string().optional(),
});
export type ProviderFormData = z.infer<typeof ProviderSchema>;

// Schema for Provider Payment
export const ProviderPaymentSchema = z.object({
    providerId: z.string().min(1, "Debe seleccionar un proveedor."),
    invoiceId: z.string().min(1, "Debe seleccionar una factura."),
    amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
    paymentDate: z.date({ errorMap: () => ({ message: "La fecha de pago es requerida."}) }),
    paymentMethod: z.enum(['Transferencia', 'Efectivo', 'Cheque'], {
        errorMap: () => ({ message: "Debe seleccionar un método de pago." })
    }),
    notes: z.string().optional(),
});
export type ProviderPaymentFormData = z.infer<typeof ProviderPaymentSchema>;
