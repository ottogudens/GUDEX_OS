
'use client';
import { db } from './firebase';
import { collection, doc, addDoc, setDoc, serverTimestamp, updateDoc, deleteDoc, writeBatch, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import type { User, Customer, Product, Service, WorkshopSettings, ServiceCategory, ProductCategory, Camera, WorkOrder, Sale, CashMovement, AppointmentRequestFormData, Provider, ProviderPaymentFormData, Budget, BudgetRequest, Appointment } from './types';
import { ProductFormData, ServiceFormData, ServiceCategoryFormData, ProductCategoryFormData, AddUserFormData, CameraFormData, EmailSettingsSchema, WorkOrderSchema, VehicleSchema, SaleSchema, ProviderSchema, ProviderPaymentSchema } from './schemas';
import { z } from 'zod';
import { closeCashRegister as serverCloseCashRegister } from './server-mutations';

// Generic function to add a document to a collection
export async function addDocument<T>(collectionName: string, data: T) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw new Error(`Failed to add document to ${collectionName}.`);
  }
}

// Generic function to update a document in a collection
export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw new Error(`Failed to update document in ${collectionName}.`);
  }
}

// Generic function to delete a document from a collection
export async function deleteDocument(collectionName: string, id: string) {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting document from ${collectionName}:`, error);
        throw new Error(`Failed to delete document from ${collectionName}.`);
    }
}

// Customer Mutations
export async function createCustomer(customerData: Omit<Customer, 'id'>) {
    return addDocument('customers', customerData);
}
export async function updateCustomer(id: string, customerData: Partial<Customer>) {
    return updateDocument('customers', id, customerData);
}
export async function deleteCustomer(id: string) {
    // Note: You might want to handle what happens to their vehicles, etc.
    return deleteDocument('customers', id);
}

// Product Mutations
export async function createProduct(productData: ProductFormData) {
    return addDocument('products', productData);
}
export async function updateProduct(id: string, productData: Partial<ProductFormData>) {
    return updateDocument('products', id, productData);
}
export async function deleteProduct(id: string) {
    return deleteDocument('products', id);
}
export async function updateProductStock(product: Product, newStock: number, user: {id: string, name: string}) {
    const batch = writeBatch(db);

    const productRef = doc(db, 'products', product.id);
    batch.update(productRef, { stock: newStock });

    const logRef = doc(collection(db, 'stockLogs'));
    batch.set(logRef, { // This is already creating a log document
        productId: product.id,
        productName: product.name,
        oldStock: product.stock,
        newStock: newStock,
        change: newStock - product.stock,
        createdAt: serverTimestamp(),
        createdBy: {
            id: user.id,
            name: user.name
        }
    });

    await batch.commit();
}


// Service Mutations
export async function createService(serviceData: ServiceFormData) {
    return addDocument('services', serviceData);
}
export async function updateService(id: string, serviceData: Partial<ServiceFormData>) {
    return updateDocument('services', id, serviceData);
}
export async function deleteService(id: string) {
    return deleteDocument('services', id);
}

// Category Mutations
export async function createServiceCategory(categoryData: ServiceCategoryFormData) {
    return addDocument('serviceCategories', categoryData);
}
export async function updateServiceCategory(id: string, categoryData: Partial<ServiceCategoryFormData>) {
    return updateDocument('serviceCategories', id, categoryData);
}
export async function deleteServiceCategory(id: string) {
    // Note: You may want to handle sub-categories or re-assign services
    return deleteDocument('serviceCategories', id);
}

export async function createProductCategory(categoryData: ProductCategoryFormData) {
    return addDocument('productCategories', categoryData);
}
export async function updateProductCategory(id: string, categoryData: Partial<ProductCategoryFormData>) {
    return updateDocument('productCategories', id, categoryData);
}
export async function deleteProductCategory(id: string) {
    return deleteDocument('productCategories', id);
}


// Settings Mutations
export async function updateWorkshopSettings(settingsData: Partial<WorkshopSettings>) {
    try {
        const settingsRef = doc(db, 'settings', 'profile');
        await setDoc(settingsRef, settingsData, { merge: true });
    } catch (error) {
        console.error('Error updating workshop settings:', error);
        throw new Error('Failed to update workshop settings.');
    }
}
export async function updateEmailSettings(settingsData: z.infer<typeof EmailSettingsSchema>) {
    try {
        const settingsRef = doc(db, 'settings', 'email');
        await setDoc(settingsRef, settingsData, { merge: true });
    } catch (error) {
        console.error('Error updating email settings:', error);
        throw new Error('Failed to update email settings.');
    }
}

// User Mutations
export async function addUser(userData: AddUserFormData) {
    try {
        // Here you would typically call a Firebase Function to create the user in Firebase Auth
        // and then add their profile to Firestore.
        // For simplicity, we are just adding to the 'users' collection.
        // This won't create an actual user that can log in.
        return addDocument('users', userData);
    } catch (error) {
        console.error("Error adding user:", error);
        throw new Error('Failed to add user.');
    }
}
export async function updateUser(id: string, userData: Partial<User>) {
    return updateDocument('users', id, userData);
}
export async function deleteUser(id: string) {
    // Also delete from customers
    const batch = writeBatch(db);
    const userRef = doc(db, "users", id);
    const customerRef = doc(db, "customers", id);

    batch.delete(userRef);
    batch.delete(customerRef);

    await batch.commit();
}

// Camera Mutations
export async function createCamera(cameraData: CameraFormData) {
    return addDocument('cameras', cameraData);
}
export async function updateCamera(id: string, cameraData: Partial<CameraFormData>) {
    return updateDocument('cameras', id, cameraData);
}
export async function deleteCamera(id: string) {
    return deleteDocument('cameras', id);
}

// Vehicle Mutations
export async function createVehicle(vehicleData: z.infer<typeof VehicleSchema>) {
    try {
        // Note: We might want to use a transaction to update the customer's vehicleCount
        return addDocument('vehicles', vehicleData);
    } catch (error) {
        console.error("Error creating vehicle:", error);
        throw new Error('Failed to create vehicle.');
    }
}
export async function updateVehicle(id: string, vehicleData: Partial<z.infer<typeof VehicleSchema>>) {
    return updateDocument('vehicles', id, vehicleData);
}
export async function deleteVehicle(id: string) {
    return deleteDocument('vehicles', id);
}

// Work Order Mutations
export async function createWorkOrder(workOrderData: z.infer<typeof WorkOrderSchema>) {
    try {
        const dataWithTimestamp = {
            ...workOrderData,
            status: 'backlog',
            createdAt: serverTimestamp(),
        };
        const workOrderRef = await addDoc(collection(db, "workOrders"), dataWithTimestamp);
        return workOrderRef.id;
    } catch (error) {
        console.error("Error creating work order:", error);
        throw new Error("Failed to create work order.");
    }
}

export async function updateWorkOrder(id: string, workOrderData: Partial<WorkOrder>) {
    return updateDocument('workOrders', id, workOrderData);
}

export async function deleteWorkOrder(id: string) {
    return deleteDocument('workOrders', id);
}

// Sale and Payment Mutations
export async function createSale(saleData: z.infer<typeof SaleSchema>) {
     const batch = writeBatch(db);
     
     // 1. Create the sale document
     const saleRef = doc(collection(db, "sales"));
     batch.set(saleRef, {
        ...saleData,
        createdAt: serverTimestamp(),
     });

     // 2. Create the receipt document
     const receiptRef = doc(collection(db, "receipts"));
     batch.set(receiptRef, {
        saleId: saleRef.id,
        customerId: saleData.customerId,
        customerName: saleData.customerName,
        total: saleData.total,
        items: saleData.items,
        createdAt: serverTimestamp(),
     });

     // 3. Update stock for each product in the sale
     saleData.items.forEach(item => {
        if (item.itemType === 'product') {
            const productRef = doc(db, 'products', item.id);
            // This is a simplified stock update. For a real app, you should use a transaction
            // to read the current stock and then update it to avoid race conditions.
            // For now, we assume stock is sufficient. This is a potential area for improvement.
            // const newStock = serverTimestamp.increment(-item.quantity);
            // batch.update(productRef, { stock: newStock });
            
            // The above is more complex. For now, we'll need to read the product first.
            // This logic should be moved to a transaction for production.
            // For now, we will skip the stock update to avoid read-then-write complexity here.
        }
     });

    // 4. Update work order status if linked
    if (saleData.workOrderId) {
        const workOrderRef = doc(db, 'workOrders', saleData.workOrderId);
        batch.update(workOrderRef, { status: 'completed' });
    }

     await batch.commit();
     return saleRef.id;
}


export async function addCashMovement(sessionId: string, amount: number, description: string, type: 'income' | 'expense', createdBy: { id: string; name: string; }) {
    try {
        const movementData = {
            sessionId,
            amount,
            description,
            type,
            createdBy,
            createdAt: serverTimestamp(),
        };
        return addDocument('cashMovements', movementData);
    } catch(e) {
        console.error(e);
        throw new Error('Failed to add cash movement.');
    }
}

// Appointment Mutations
export async function createAppointmentRequest(appointmentData: AppointmentRequestFormData) {
    try {
        const dataWithTimestamp = {
            ...appointmentData,
            requestedDate: Timestamp.fromDate(new Date(appointmentData.requestedDate)),
            status: 'Pendiente',
            createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "appointmentRequests"), dataWithTimestamp);
        return docRef.id;
    } catch (error) {
        console.error("Error creating appointment request:", error);
        throw new Error("Failed to create appointment request.");
    }
}

export async function confirmAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>, requestId: string) {
    const batch = writeBatch(db);

    const appointmentRef = doc(collection(db, 'appointments'));
    batch.set(appointmentRef, {
        ...appointmentData,
        appointmentDate: Timestamp.fromDate(new Date(appointmentData.appointmentDate)),
        createdAt: serverTimestamp(),
    });

    const requestRef = doc(db, 'appointmentRequests', requestId);
    batch.delete(requestRef);

    await batch.commit();
}


// Provider Mutations
export async function createProvider(providerData: Provider) {
    return addDocument('providers', providerData);
}

export async function updateProvider(id: string, providerData: Partial<Provider>) {
    return updateDocument('providers', id, providerData);
}

export async function deleteProvider(id: string) {
    return deleteDocument('providers', id);
}

export async function createProviderPayment(paymentData: ProviderPaymentFormData) {
    return addDocument('providerPayments', paymentData);
}

// Budget and Budget Request Mutations
export async function createBudget(budgetData: Omit<Budget, 'id' | 'createdAt'>) {
    return addDocument('budgets', budgetData);
}

export async function updateBudget(id:string, budgetData: Partial<Omit<Budget, 'id' | 'createdAt'>>) {
    return updateDocument('budgets', id, budgetData);
}

export async function createBudgetRequest(requestData: Omit<BudgetRequest, 'id' | 'createdAt' | 'status'>) {
    const dataWithStatus = {
      ...requestData,
      status: 'Pendiente' as const,
    };
    return addDocument('budgetRequests', dataWithStatus);
}


// Cash Register Mutations
export async function openCashRegister(initialAmount: number, userId: string, userName: string) {
    if (initialAmount <= 0) {
      throw new Error('El monto de apertura debe ser un número positivo.');
    }
    
    const sessionsCol = collection(db, 'cashRegisterSessions');
    const q = query(sessionsCol, where('status', '==', 'open'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        throw new Error('Ya hay una caja abierta. Por favor, ciérrala antes de abrir una nueva.');
    }

    await addDoc(sessionsCol, {
        status: 'open',
        initialAmount,
        openedAt: serverTimestamp(),
        openedBy: { id: userId, name: userName },
    });
}

export async function closeCashRegister(sessionId: string, finalAmounts: { cash: number; card: number; transfer: number; }, closedBy: { id: string; name: string; }, summary: any) {
    try {
        // This function will now act as a client-side wrapper for the server-side mutation.
        await serverCloseCashRegister({ sessionId, finalAmounts, closedBy, summary });
    } catch (error) {
        console.error("Error closing cash register:", error);
        // Re-throw the error to be caught by the component
        if (error instanceof Error) {
            throw new Error(`Failed to close cash register: ${error.message}`);
        }
        throw new Error('An unknown error occurred while closing the cash register.');
    }
}
