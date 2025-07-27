// This file contains the centralized type definitions for the application.
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Administrador' | 'Mecanico' | 'Cliente';

export interface User {
  id?: string; // Optional id for Firestore documents
  name: string;
  email: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  name:string;
  email: string;
  phone: string;
  vehicleCount: number;
  lastVisit: string;
  memberSince: string;
  createdAt: Timestamp; // for serverTimestamp
}

export interface Vehicle {
  id: string;
  customerId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  engineDisplacement: string;
  fuelType: 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido' | 'Otro';
  transmissionType: 'Manual' | 'Automática';
  vin?: string;
  imageUrl?: string;
  engineNumber?: string;
  color?: string;
  oilFilter?: string;
  airFilter?: string;
  fuelFilter?: string;
  pollenFilter?: string;
  createdAt: Timestamp;
}

export interface ServiceHistory {
    id: string;
    vehicleId: string;
    date: string;
    service: string;
    cost: number;
    status: 'Completado' | 'En Progreso' | 'Pendiente';
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string;
  salePrice: number;
  purchasePrice?: number;
  stock: number;
  barcode?: string;
  category: string;
  subcategory?: string;
  imageUrl?: string;
  visibleInPOS: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  code: string;
  availableInPOS: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  availableInPOS: boolean;
  parentId?: string | null;
  subcategories?: ServiceCategory[];
}

export interface ProductCategory {
  id: string;
  name: string;
  visibleInPOS: boolean;
  parentId?: string | null;
  subcategories?: ProductCategory[];
}

export interface WorkshopSettings {
  id?: string;
  name: string;
  rut: string;
  address: string;
  phone: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  logoUrl: string;
}

export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  description: string;
  customer: string; // Storing name for display convenience
  customerId: string;
  vehicle: string;
  vehicleId: string;
  assignedTo: string;
  image?: string;
  "data-ai-hint"?: string;
  status: 'backlog' | 'inProgress' | 'approval' | 'completed' | 'paid';
  total: number;
  items: SaleItem[];
  createdAt: Timestamp; // for serverTimestamp
}

export type PaymentMethod = 'Tarjeta' | 'Efectivo' | 'Transferencia';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  itemType: 'product' | 'service' | 'work-order';
}

export type CartItem = SaleItem & {
    price: number;
};

export interface Sale {
  id?: string;
  customerId: string | null;
  customerName: string;
  workOrderId: string | null;
  cashRegisterSessionId: string;
  items: SaleItem[];
  subtotal: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  };
  total: number;
  payments: Payment[];
  createdAt: Timestamp; // for serverTimestamp
}

export interface Receipt {
  id?: string;
  saleId: string;
  customerId: string | null;
  customerName: string;
  createdAt: Timestamp; // For serverTimestamp
  pdfAsBase64: string;
}

export type RecentActivity = {
  id: string;
  vehicle: string;
  customer: string;
  status: WorkOrder['status'];
};

export type DashboardData = {
  totalRevenue: number;
  activeOrders: number;
  completedThisMonth: number;
  newCustomersThisMonth: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentActivity: RecentActivity[];
  pendingAppointments: AppointmentRequest[];
  confirmedAppointments: Appointment[];
};

export type BestSeller = {
    name: string;
    quantity: number;
};

export type SalesSummaryData = {
  sales: Sale[];
  bestSellers: BestSeller[];
  totalSales: number;
  averageSale: number;
};

export interface CashRegisterSession {
  id: string;
  status: 'open' | 'closed';
  initialAmount: number;
  finalAmount?: number; // Total cash counted, for backward compatibility
  finalAmounts?: {
    cash: number;
    card: number;
    transfer: number;
  };
  openedAt: Timestamp;
  closedAt?: Timestamp;
  openedBy: { id: string; name: string; };
  closedBy?: { id: string; name: string; };
  // Fields for the final summary stored upon closing
  totalSales?: number;
  cashSales?: number;
  cardSales?: number;
  transferSales?: number;
  manualIncome?: number;
  manualExpense?: number;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  createdAt: Timestamp;
  createdBy: { id: string; name: string; };
}

export interface EmailSettings {
  id?: 'email';
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  secure: boolean;
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  sentAt: Timestamp;
  status: 'Enviado' | 'Fallido';
  flow: string;
}

export interface EmailLog {
  id: string;
  level: 'INFO' | 'ERROR';
  message: string;
  flow: string;
  createdAt: Timestamp;
}

export interface StockLog {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  oldStock: number;
  newStock: number;
  change: number;
  reason: 'Toma de Inventario' | 'Ajuste Manual' | 'Venta';
  user: {
    id: string;
    name: string;
  };
  createdAt: Timestamp;
}

export interface Appointment {
    id: string;
    customerId: string;
    customerName: string;
    vehicleId: string;
    vehicleDescription: string;
    service: string;
    notes?: string;
    requestedDate: Timestamp;
    status: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
    createdAt: Timestamp;
}

export interface Provider {
  id: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  bank: string;
  accountNumber: string;
  paymentTerms: string;
  discounts?: string;
  representativeName?: string;
  representativeEmail?: string;
  representativePhone?: string;
  createdAt: Timestamp;
}

export interface ProviderPayment {
    id: string;
    providerId: string;
    providerName: string;
    invoiceId: string; // The ID of the purchase invoice
    amount: number;
    paymentDate: Timestamp;
    paymentMethod: 'Transferencia' | 'Efectivo' | 'Cheque';
    notes?: string;
    recordedBy: {
        id: string;
        name: string;
    };
    createdAt: Timestamp;
}

export interface PurchaseInvoice {
    id: string;
    providerId: string;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    status: 'Pendiente' | 'Pagada';
}

export interface Budget {
    id: string;
    customerId: string;
    customerName: string;
    vehicleId: string;
    vehicleDescription: string;
    total: number;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado';
    createdAt: Timestamp;
}

export interface BudgetRequest {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    vehicleId: string;
    vehicleIdentifier: string;
    description: string;
    status: 'Pendiente' | 'Revisado';
    createdAt: Timestamp;
}

export interface AppointmentRequest {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    vehicleId: string;
    vehicleIdentifier: string;
    service: string;
    notes?: string;
    requestedDate: string;
    status: 'Pendiente' | 'Confirmada' | 'Cancelada';
}

// =================================
//  Digital Vehicle Inspection (DVI)
// =================================

export type DVIPointStatus = 'ok' | 'attention' | 'critical';

export interface DVIPoint {
  id: string;
  label: string;
  status: DVIPointStatus;
  notes?: string;
  images?: string[]; // Array of image URLs from Firebase Storage
}

export interface DVISection {
  id: string;
  title: string;
  points: DVIPoint[];
}

export interface DVI {
  id: string;
  workOrderId?: string;
  templateName: string;
  status: 'in-progress' | 'completed';
  inspector: {
    id: string;
    name: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    plate: string;
  };
  customer: {
    id: string;
    name: string;
  };
  sections: DVISection[];
  summaryNotes?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface DVITemplate {
  id: string;
  name: string;
  sections: Array<{
    id: string;
    title: string;
    points: Array<{
      id: string;
      label: string;
    }>;
  }>;
}
