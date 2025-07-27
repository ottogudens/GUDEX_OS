
import * as z from 'zod';

export const CreateDVISchema = z.object({
  vehicleId: z.string().min(1, 'Se requiere el ID del vehículo.'),
  templateId: z.string().min(1, 'Se requiere el ID de la plantilla.'),
});

export const DVIPhotoUploadSchema = z.object({
  dviId: z.string().min(1),
  pointId: z.string().min(1),
  file: z.instanceof(File).refine(file => file.size > 0, 'El archivo es obligatorio.').refine(file => file.size < 4 * 1024 * 1024, 'El archivo no puede pesar más de 4MB.'),
});

const DVIPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ok', 'attention', 'critical']),
  notes: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

const DVISectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  points: z.array(DVIPointSchema),
});

export const DVIUpdateSchema = z.object({
  id: z.string().min(1),
  sections: z.array(DVISectionSchema),
});


export const DVITemplateSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
});

// NUEVO ESQUEMA PARA LA ACTUALIZACIÓN DE PLANTILLAS
const DVIPointTemplateSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'El nombre del punto no puede estar vacío.'),
});

const DVISectionTemplateSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'El nombre de la sección no puede estar vacío.'),
    points: z.array(DVIPointTemplateSchema),
});

export const DVITemplateUpdateSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    sections: z.array(DVISectionTemplateSchema),
});
// FIN DEL NUEVO ESQUEMA

export const WhatsAppFlowSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  keywords: z.array(z.string()).min(1, 'Se requiere al menos una palabra clave.'),
  responses: z.array(z.object({
    type: z.literal('text'),
    content: z.string().min(1, 'El contenido de la respuesta no puede estar vacío.'),
    media: z.string().url().nullable().optional(),
  })).min(1, 'Se requiere al menos una respuesta.'),
  isEnabled: z.boolean(),
});

export const ProductCategorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  visibleInPOS: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
});

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

export const AppointmentRequestSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  vehicleId: z.string(),
  vehicleIdentifier: z.string(),
  service: z.string(),
  notes: z.string().optional(),
  requestedDate: z.string(),
});

export const PurchaseInvoiceSchema = z.object({
  providerId: z.string().min(1, "El proveedor es obligatorio."),
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio."),
  date: z.date(),
  items: z.array(z.object({
    productId: z.string().min(1, "El producto es obligatorio."),
    quantity: z.number().min(1, "La cantidad debe ser al menos 1."),
    purchasePrice: z.number().min(0, "El precio de compra no puede ser negativo."),
  })).min(1, "Debe haber al menos un ítem en la factura."),
});

export const WorkshopSettingsSchema = z.object({
    name: z.string().min(1, "El nombre del taller es obligatorio."),
    rut: z.string().min(1, "El RUT es obligatorio."),
    address: z.string().min(1, "La dirección es obligatoria."),
    phone: z.string().min(1, "El teléfono es obligatorio."),
    whatsapp: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    logoUrl: z.string().url("URL de logo inválida.").optional(),
});

export const AddUserSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    email: z.string().email("Email inválido."),
    role: z.enum(['Administrador', 'Mecanico', 'Cliente']),
});

export const CameraSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    rtspUrl: z.string().url("URL de RTSP inválida."),
});

export const EmailSettingsSchema = z.object({
    host: z.string().min(1, "El host es obligatorio."),
    port: z.number().int().min(1, "El puerto es obligatorio."),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().email("Email 'from' inválido."),
    secure: z.boolean(),
});

export const CustomerSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    email: z.string().email("Email inválido."),
    phone: z.string().min(1, "El teléfono es obligatorio."),
});
