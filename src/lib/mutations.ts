
'use server';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
  query,
  where,
  runTransaction,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { revalidatePath } from 'next/cache';
import { Customer, Vehicle, Appointment, WorkOrder, Service, ServiceCategory, Product, Sale, Provider, Budget, PurchaseInvoice, CashRegisterSession, CashMovement, Camera, User, EmailSettings } from './types';
import { VehicleFormData, WorkOrderFormData, ServiceSchema, ProductSchema, ProviderFormData, WorkshopSettingsSchema, AddUserSchema, CameraSchema, EmailSettingsSchema } from './schemas';
import * as z from 'zod';

// =================================
// CUSTOMER MUTATIONS
// =================================

export async function createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'vehicleCount' | 'lastVisit' | 'memberSince'>) {
    try {
        const newCustomerRef = doc(collection(db, 'customers'));
        const newCustomer: Omit<Customer, 'id'> = {
            ...customerData,
            vehicleCount: 0,
            lastVisit: 'N/A',
            memberSince: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(newCustomerRef, newCustomer);
        revalidatePath('/customers');
        return { success: true, id: newCustomerRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateCustomer(customerId: string, customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>) {
    try {
        const customerRef = doc(db, 'customers', customerId);
        await updateDoc(customerRef, customerData);
        revalidatePath('/customers');
        revalidatePath(`/customers/${customerId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteCustomer(customerId: string) {
    try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('customerId', '==', customerId));
        const vehicleSnapshot = await getDocs(q);

        if (!vehicleSnapshot.empty) {
            throw new Error('This customer has associated vehicles and cannot be deleted.');
        }

        const customerRef = doc(db, 'customers', customerId);
        await deleteDoc(customerRef);
        revalidatePath('/customers');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


// =================================
// VEHICLE MUTATIONS
// =================================

export async function createVehicle(data: VehicleFormData) {
    // Placeholder implementation
    console.log("Creating vehicle with data:", data);
    return { success: true };
}

export async function updateVehicle(vehicleId: string, data: VehicleFormData, imageFile: File | null) {
    try {
        let imageUrl = data.imageUrl;

        if (imageFile) {
            const storageRef = ref(storage, `vehicles/${vehicleId}/${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, { ...data, imageUrl });

        revalidatePath('/vehicles');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function deleteVehicle(vehicleId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    
    const workOrdersQuery = query(collection(db, 'workOrders'), where('vehicleId', '==', vehicleId), limit(1));
    const workOrderSnapshot = await getDocs(workOrdersQuery);
    if (!workOrderSnapshot.empty) {
      return { success: false, message: 'No se puede eliminar un vehículo con órdenes de trabajo asociadas.' };
    }

    await deleteDoc(vehicleRef);
    
    try {
      const imageRef = ref(storage, `vehicles/${vehicleId}`);
    } catch (storageError) {
      console.error("Could not delete vehicle image from storage:", storageError);
    }

    revalidatePath('/vehicles');
    return { success: true };

  } catch (error: any) {
    console.error("Error deleting vehicle:", error);
    return { success: false, message: error.message || 'No se pudo eliminar el vehículo.' };
  }
}

// =================================
// APPOINTMENT MUTATIONS
// =================================

export async function confirmAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>, requestId: string) {
    return runTransaction(db, async (transaction) => {
        const newAppointmentRef = doc(collection(db, 'appointments'));
        const requestRef = doc(db, 'appointmentRequests', requestId);

        const newAppointment = {
            ...appointmentData,
            createdAt: serverTimestamp() as Timestamp,
        };

        transaction.set(newAppointmentRef, newAppointment);
        transaction.delete(requestRef);
    }).then(() => {
        revalidatePath('/appointments');
        return { success: true };
    }).catch((error: any) => {
        return { success: false, message: error.message };
    });
}

export async function createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>) {
    try {
        const newAppointmentRef = doc(collection(db, 'appointments'));
        const newAppointment = {
            ...appointmentData,
            createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(newAppointmentRef, newAppointment);
        revalidatePath('/appointments');
        return { success: true, id: newAppointmentRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// =================================
// WORK ORDER MUTATIONS
// =================================

export async function createWorkOrder(data: WorkOrderFormData) {
    try {
        const total = data.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const newWorkOrderRef = collection(db, 'workOrders');
        const workOrder: Omit<WorkOrder, 'id'> = {
            ...data,
            code: Math.random().toString(36).substr(2, 9).toUpperCase(),
            status: 'backlog',
            total,
            createdAt: serverTimestamp() as Timestamp,
        };
        await addDoc(newWorkOrderRef, workOrder);
        revalidatePath('/work-orders');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateWorkOrderStatus(workOrderId: string, status: WorkOrder['status']) {
    try {
        const workOrderRef = doc(db, 'workOrders', workOrderId);
        await updateDoc(workOrderRef, { status });
        revalidatePath('/work-orders');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// =================================
// SERVICE MUTATIONS
// =================================

export async function createService(data: z.infer<typeof ServiceSchema>) {
    try {
        const newServiceRef = doc(collection(db, 'services'));
        const newService = {
            ...data,
            code: Math.random().toString(36).substr(2, 9).toUpperCase(),
        };
        await setDoc(newServiceRef, newService);
        revalidatePath('/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateService(serviceId: string, data: z.infer<typeof ServiceSchema>) {
    try {
        const serviceRef = doc(db, 'services', serviceId);
        await updateDoc(serviceRef, data);
        revalidatePath('/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteService(serviceId: string) {
    try {
        const serviceRef = doc(db, 'services', serviceId);
        await deleteDoc(serviceRef);
        revalidatePath('/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createServiceCategory(data: Partial<ServiceCategory>) {
    try {
        const newCategoryRef = doc(collection(db, 'serviceCategories'));
        await setDoc(newCategoryRef, data);
        revalidatePath('/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// =================================
// PRODUCT MUTATIONS
// =================================

export async function createProduct(data: z.infer<typeof ProductSchema>) {
    try {
        const newProductRef = doc(collection(db, 'products'));
        const newProduct = {
            ...data,
            code: Math.random().toString(36).substr(2, 9).toUpperCase(),
        };
        await setDoc(newProductRef, newProduct);
        revalidatePath('/products');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateProduct(productId: string, data: z.infer<typeof ProductSchema>, imageFile: File | null) {
    try {
        let imageUrl = data.imageUrl;

        if (imageFile) {
            const storageRef = ref(storage, `products/${productId}/${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, { ...data, imageUrl });

        revalidatePath('/products');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteProduct(productId: string) {
    try {
        const productRef = doc(db, 'products', productId);
        await deleteDoc(productRef);
        revalidatePath('/products');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateProductStock(product: Product, newStock: number, user: { id: string; name: string }) {
    try {
        const productRef = doc(db, 'products', product.id);
        const stockLogRef = doc(collection(db, 'stockLogs'));

        const batch = writeBatch(db);

        batch.update(productRef, { stock: newStock });
        batch.set(stockLogRef, {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            oldStock: product.stock,
            newStock,
            change: newStock - product.stock,
            reason: 'Toma de Inventario',
            user,
            createdAt: serverTimestamp()
        });

        await batch.commit();

        revalidatePath('/inventory/stock-take');
        revalidatePath('/inventory/records');

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// =================================
// SALE MUTATIONS
// =================================

export async function createSale(saleData: Omit<Sale, 'id' | 'createdAt'>) {
    try {
        const newSaleRef = doc(collection(db, 'sales'));
        const newSale = {
            ...saleData,
            createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(newSaleRef, newSale);
        
        const batch = writeBatch(db);
        saleData.items.forEach(item => {
            if (item.itemType === 'product') {
                const productRef = doc(db, 'products', item.id);
                batch.update(productRef, { stock: -item.quantity });
            }
        });
        await batch.commit();

        revalidatePath('/pos');
        revalidatePath('/sales/summary');
        
        return { success: true, id: newSaleRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// =================================
// PROVIDER MUTATIONS
// =================================

export async function createProvider(data: ProviderFormData) {
    try {
        const newProviderRef = doc(collection(db, 'providers'));
        const newProvider: Omit<Provider, 'id'> = {
            ...data,
            createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(newProviderRef, newProvider);
        revalidatePath('/purchases/providers');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateProvider(providerId: string, data: ProviderFormData) {
    try {
        const providerRef = doc(db, 'providers', providerId);
        await updateDoc(providerRef, data);
        revalidatePath('/purchases/providers');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteProvider(providerId: string) {
    try {
        const providerRef = doc(db, 'providers', providerId);
        await deleteDoc(providerRef);
        revalidatePath('/purchases/providers');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createBudgetRequest(data: any) {
    try {
        const newRequestRef = doc(collection(db, 'budgetRequests'));
        await setDoc(newRequestRef, {
            ...data,
            status: 'Pendiente',
            createdAt: serverTimestamp() as Timestamp,
        });
        revalidatePath('/portal/budgets');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createAppointmentRequest(data: any) {
    try {
        const newRequestRef = doc(collection(db, 'appointmentRequests'));
        await setDoc(newRequestRef, {
            ...data,
            status: 'Pendiente',
            createdAt: serverTimestamp() as Timestamp,
        });
        revalidatePath('/portal/schedule');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createPurchaseInvoice(data: PurchaseInvoice) {
    // Placeholder implementation
    console.log("Creating purchase invoice with data:", data);
    return { success: true };
}

export async function openCashRegister(data: CashRegisterSession) {
    // Placeholder implementation
    console.log("Opening cash register with data:", data);
    return { success: true };
}

export async function addCashMovement(data: CashMovement) {
    // Placeholder implementation
    console.log("Adding cash movement with data:", data);
    return { success: true };
}

export async function closeCashRegister(data: CashRegisterSession) {
    // Placeholder implementation
    console.log("Closing cash register with data:", data);
    return { success: true };
}

export async function updateWorkshopSettings(data: WorkshopSettingsSchema) {
    // Placeholder implementation
    console.log("Updating workshop settings with data:", data);
    return { success: true };
}

export async function addUser(data: AddUserSchema) {
    // Placeholder implementation
    console.log("Adding user with data:", data);
    return { success: true };
}

export async function updateUser(data: User) {
    // Placeholder implementation
    console.log("Updating user with data:", data);
    return { success: true };
}

export async function deleteUser(data: User) {
    // Placeholder implementation
    console.log("Deleting user with data:", data);
    return { success: true };
}

export async function createCamera(data: CameraSchema) {
    // Placeholder implementation
    console.log("Creating camera with data:", data);
    return { success: true };
}

export async function updateCamera(data: Camera) {
    // Placeholder implementation
    console.log("Updating camera with data:", data);
    return { success: true };
}

export async function deleteCamera(data: Camera) {
    // Placeholder implementation
    console.log("Deleting camera with data:", data);
    return { success: true };
}

export async function updateEmailSettings(data: EmailSettingsSchema) {
    // Placeholder implementation
    console.log("Updating email settings with data:", data);
    return { success: true };
}

export async function migrateExistingDataToCorrelativeCodes() {
    // Placeholder implementation
    console.log("Migrating existing data to correlative codes...");
    return { success: true };
}

export async function updateBudget(data: Budget) {
    // Placeholder implementation
    console.log("Updating budget with data:", data);
    return { success: true };
}

export async function createBudget(data: Budget) {
    // Placeholder implementation
    console.log("Creating budget with data:", data);
    return { success: true };
}
