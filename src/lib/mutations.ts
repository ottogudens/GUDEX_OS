
'use client';
/**
 * =====================================================================================
 * FIRESTORE SECURITY RULES
 * =====================================================================================
 * To prevent "permission-denied" errors, deploy the rules from the `firestore.rules`
 * file located in the root of your project. You can do this by copying its content
 * into the Rules tab of your Firestore database in the Firebase console, or by
 * running `firebase deploy --only firestore:rules` if you have the Firebase CLI.
 * =====================================================================================
 */
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  runTransaction,
  getDoc,
  limit,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
import type { User, WorkOrder, Sale, Product, Timestamp, CashRegisterSession, CashMovement, Customer, SentEmail } from './types';
import type { 
    CustomerFormData,
    ProductFormData,
    ServiceFormData,
    ServiceCategoryFormData,
    ProductCategoryFormData,
    WorkshopSettingsFormData,
    AddUserFormData,
    CameraFormData,
    EmailSettingsFormData,
    WorkOrderFormData,
    VehicleFormData,
    AppointmentRequestFormData,
    ProviderFormData
} from './schemas';
import { getAuth, createUserWithEmailAndPassword, signOut, deleteUser as deleteAuthUser } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserProfile } from './data';
import { sendAppointmentRequestEmail } from '@/ai/flows/send-appointment-request-email-flow';

// Function to create a customer
export async function createCustomer(data: CustomerFormData): Promise<Pick<Customer, 'id' | 'name'>> {
  const { name, email, phone } = data;
  const defaultPassword = "12345678";
  
  // Initialize a secondary Firebase app to create user without affecting admin session
  const secondaryAppName = `secondary-app-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, defaultPassword);
    const uid = userCredential.user.uid;

    // 2. Create user profile and customer entry in Firestore
    await createUserProfile(uid, name, email, phone);

    // 3. Send welcome email (Removed call to fix build issue)
    // In a real production app, this should be handled by a server-side trigger (e.g., Cloud Function)
    // after a new user/customer document is created in Firestore.
    
    return { id: uid, name };

  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este correo electrónico ya está registrado.');
    }
    console.error("Error creating customer and auth user:", error);
    throw new Error('Ocurrió un error al crear el cliente.');
  } finally {
    // 4. Clean up secondary app
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}

export async function deleteCustomer(customerId: string) {
  const customerRef = doc(db, 'customers', customerId);
  const customerDoc = await getDoc(customerRef);
  if (customerDoc.exists() && customerDoc.data().vehicleCount > 0) {
      throw new Error("No se puede eliminar un cliente que tiene vehículos registrados.");
  }

  const batch = writeBatch(db);
  
  batch.delete(customerRef);
  
  const userRef = doc(db, 'users', customerId);
  batch.delete(userRef);

  await batch.commit();
}


async function handleImageUpload(file: File | null, existingImageUrl?: string): Promise<string | undefined> {
    if (!file) return existingImageUrl;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      throw new Error('La imagen no puede pesar más de 2MB.');
    }
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${file.type};base64,${base64}`;
}


// Function to create a product
export async function createProduct(data: ProductFormData, imageFile: File | null) {
  const imageUrl = await handleImageUpload(imageFile);
  
  await runTransaction(db, async (transaction) => {
    const countersRef = doc(db, 'settings', 'counters');
    const countersDoc = await transaction.get(countersRef);
    
    let nextProductNumber = 1;
    if (countersDoc.exists()) {
      nextProductNumber = (countersDoc.data().productCounter || 0) + 1;
    }

    const code = `PROD-${String(nextProductNumber).padStart(6, '0')}`;
    
    const newProductRef = doc(collection(db, 'products'));
    transaction.set(newProductRef, {
      ...data,
      code,
      imageUrl: imageUrl || data.imageUrl || '',
      createdAt: serverTimestamp(),
    });

    transaction.set(countersRef, { productCounter: nextProductNumber }, { merge: true });
  });
}

// Function to update a product
export async function updateProduct(id: string, data: Partial<ProductFormData>, imageFile: File | null) {
  const productDocRef = doc(db, 'products', id);
  const imageUrl = await handleImageUpload(imageFile, data.imageUrl);
  await updateDoc(productDocRef, { ...data, imageUrl: imageUrl || data.imageUrl || '' });
}

// Function to delete a product
export async function deleteProduct(id: string) {
    const productDocRef = doc(db, 'products', id);
    await deleteDoc(productDocRef);
}

// Function to update a product's stock from Stock Take page
export async function updateProductStock(product: Product, newStock: number, user: { id: string, name: string }) {
  await runTransaction(db, async (transaction) => {
    const productRef = doc(db, 'products', product.id);
    const logRef = doc(collection(db, 'stockLogs'));

    // Set the product stock update
    transaction.update(productRef, { stock: newStock });

    // Create the log entry
    transaction.set(logRef, {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      oldStock: product.stock,
      newStock: newStock,
      change: newStock - product.stock,
      reason: 'Toma de Inventario',
      user: {
        id: user.id,
        name: user.name,
      },
      createdAt: serverTimestamp(),
    });
  });
}


// Function to create a service
export async function createService(data: ServiceFormData) {
  await runTransaction(db, async (transaction) => {
    const countersRef = doc(db, 'settings', 'counters');
    const countersDoc = await transaction.get(countersRef);

    let nextServiceNumber = 1;
    if (countersDoc.exists()) {
      nextServiceNumber = (countersDoc.data().serviceCounter || 0) + 1;
    }
    
    const code = `SVC-${String(nextServiceNumber).padStart(6, '0')}`;
    
    const newServiceRef = doc(collection(db, 'services'));
    transaction.set(newServiceRef, {
      ...data,
      code,
      createdAt: serverTimestamp(),
    });

    transaction.set(countersRef, { serviceCounter: nextServiceNumber }, { merge: true });
  });
}

// Function to update a service
export async function updateService(id: string, data: Partial<ServiceFormData>) {
  const serviceDocRef = doc(db, 'services', id);
  await updateDoc(serviceDocRef, data);
}

// Function to delete a service
export async function deleteService(id:string) {
    const serviceDocRef = doc(db, 'services', id);
    await deleteDoc(serviceDocRef);
}

// Function to create a service category/subcategory
export async function createServiceCategory(data: ServiceCategoryFormData) {
  await addDoc(collection(db, 'serviceCategories'), {
    ...data,
    parentId: data.parentId || null,
    createdAt: serverTimestamp(),
  });
}

// Function to update a service category/subcategory
export async function updateServiceCategory(id: string, data: Partial<ServiceCategoryFormData>) {
  const categoryDocRef = doc(db, 'serviceCategories', id);
  const dataToUpdate = { ...data };
  if (dataToUpdate.parentId === undefined) {
    dataToUpdate.parentId = null;
  }
  await updateDoc(categoryDocRef, dataToUpdate);
}

// Function to delete a service category/subcategory
export async function deleteServiceCategory(id: string) {
   const subcategoriesQuery = query(collection(db, 'serviceCategories'), where('parentId', '==', id));
   const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
   if (!subcategoriesSnapshot.empty) {
       throw new Error('No se puede eliminar una categoría que contiene subcategorías.');
   }
   const categoryDocRef = doc(db, 'serviceCategories', id);
   await deleteDoc(categoryDocRef);
}

// Function to create a product category/subcategory
export async function createProductCategory(data: ProductCategoryFormData) {
  await addDoc(collection(db, 'productCategories'), {
    ...data,
    parentId: data.parentId || null,
    createdAt: serverTimestamp(),
  });
}

// Function to update a product category/subcategory
export async function updateProductCategory(id: string, data: Partial<ProductCategoryFormData>) {
  const categoryDocRef = doc(db, 'productCategories', id);
  const dataToUpdate = { ...data };
  if (dataToUpdate.parentId === undefined) {
    dataToUpdate.parentId = null;
  }
  await updateDoc(categoryDocRef, dataToUpdate);
}

// Function to delete a product category/subcategory
export async function deleteProductCategory(id: string) {
   const subcategoriesQuery = query(collection(db, 'productCategories'), where('parentId', '==', id));
   const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
   if (!subcategoriesSnapshot.empty) {
       throw new Error('No se puede eliminar una categoría que contiene subcategorías.');
   }
   const categoryDocRef = doc(db, 'productCategories', id);
   await deleteDoc(categoryDocRef);
}


// Function to update workshop settings
export async function updateWorkshopSettings(validatedData: WorkshopSettingsFormData, logoFile: File | null, currentLogoUrl: string) {
  let logoUrl = currentLogoUrl;

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) { // 2MB limit
      throw new Error('El logo no puede pesar más de 2MB.');
    }
    const buffer = await logoFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    logoUrl = `data:${logoFile.type};base64,${base64}`;
  }
  
  const settingsData = { ...validatedData, logoUrl };
  const settingsRef = doc(db, 'settings', 'profile');
  await setDoc(settingsRef, settingsData, { merge: true });
  return logoUrl;
}

// Function to add a new user
export async function addUser(data: AddUserFormData) {
  // This function is intended to create a user profile in Firestore.
  // The actual Firebase Auth user should be created separately for security.
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", data.email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
      throw new Error('Un usuario con este correo ya existe en la base de datos de perfiles.');
  }

  // Note: This does NOT create a Firebase Auth user. That must be done
  // through the Firebase console or a dedicated admin process.
  await addDoc(collection(db, 'users'), data);
}

// Function to update a user (e.g., role)
export async function updateUser(id: string, data: Partial<User>) {
  const userDocRef = doc(db, 'users', id);
  await updateDoc(userDocRef, data);
}

// Function to delete a user profile from Firestore.
// Does NOT delete the Firebase Auth user.
export async function deleteUser(id: string) {
  const userDocRef = doc(db, 'users', id);
  await deleteDoc(userDocRef);
}

// Function to delete ALL users and customers except the provided admin
export async function deleteAllUsersAndCustomers(adminToKeep: { uid: string, email: string }) {
    const batch = writeBatch(db);

    // Delete all documents in 'users' collection except the admin
    const usersSnapshot = await getDocs(collection(db, 'users'));
    usersSnapshot.forEach(doc => {
        if (doc.id !== adminToKeep.uid) {
            batch.delete(doc.ref);
        }
    });

    // Delete all documents in 'customers' collection except the admin's customer profile
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    customersSnapshot.forEach(doc => {
         if (doc.id !== adminToKeep.uid) {
            batch.delete(doc.ref);
        }
    });

    await batch.commit();
}


// Function to create a camera
export async function createCamera(data: CameraFormData) {
  await addDoc(collection(db, 'cameras'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Function to update a camera
export async function updateCamera(id: string, data: Partial<CameraFormData>) {
  const cameraDocRef = doc(db, 'cameras', id);
  await updateDoc(cameraDocRef, data);
}

// Function to delete a camera
export async function deleteCamera(id: string) {
    const cameraDocRef = doc(db, 'cameras', id);
    await deleteDoc(cameraDocRef);
}

// Function to update email settings
export async function updateEmailSettings(data: EmailSettingsFormData) {
  const settingsRef = doc(db, 'settings', 'email');
  await setDoc(settingsRef, data, { merge: true });
}


// Function to create a work order
export async function createWorkOrder(data: WorkOrderFormData) {
  await runTransaction(db, async (transaction) => {
    const countersRef = doc(db, 'settings', 'counters');
    const countersDoc = await transaction.get(countersRef);
    
    let nextWorkOrderNumber = 1;
    if (countersDoc.exists()) {
        nextWorkOrderNumber = (countersDoc.data().workOrderCounter || 0) + 1;
    }
    
    const code = `OT-${String(nextWorkOrderNumber).padStart(6, '0')}`;
    const total = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const newWorkOrderRef = doc(collection(db, 'workOrders'));
    transaction.set(newWorkOrderRef, {
        ...data,
        total,
        code,
        status: 'backlog',
        createdAt: serverTimestamp(),
    });
    
    transaction.set(countersRef, { workOrderCounter: nextWorkOrderNumber }, { merge: true });
  });
}

// Function to update a work order status
export async function updateWorkOrderStatus(id: string, status: WorkOrder['status']) {
  const workOrderDocRef = doc(db, 'workOrders', id);
  await updateDoc(workOrderDocRef, { status });
}

// Function to create a vehicle
export async function createVehicle(data: VehicleFormData, imageFile: File | null) {
  const imageUrl = await handleImageUpload(imageFile);

  await runTransaction(db, async (transaction) => {
    // --- READ PHASE ---
    const customerRef = doc(db, 'customers', data.customerId);
    const customerDoc = await transaction.get(customerRef);
    
    if (!customerDoc.exists()) {
      throw new Error("Cliente no encontrado. No se puede asociar el vehículo.");
    }

    // --- WRITE PHASE ---
    const vehicleRef = doc(collection(db, 'vehicles'));
    transaction.set(vehicleRef, {
      ...data,
      imageUrl: imageUrl || '',
      createdAt: serverTimestamp(),
    });

    const currentCount = customerDoc.data().vehicleCount || 0;
    transaction.update(customerRef, { vehicleCount: currentCount + 1 });
  });
}

// Function to update a vehicle
export async function updateVehicle(id: string, data: VehicleFormData, imageFile: File | null) {
  const vehicleDocRef = doc(db, 'vehicles', id);
  const currentDoc = await getDoc(vehicleDocRef);
  if (!currentDoc.exists()) {
    throw new Error("El vehículo no fue encontrado.");
  }

  const currentImageUrl = currentDoc.data().imageUrl || '';
  const imageUrl = await handleImageUpload(imageFile, currentImageUrl);

  await updateDoc(vehicleDocRef, { 
    ...data,
    imageUrl,
  });
}

// Function to delete a vehicle
export async function deleteVehicle(vehicleId: string) {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  
  await runTransaction(db, async (transaction) => {
    const vehicleDoc = await transaction.get(vehicleRef);
    if (!vehicleDoc.exists()) {
      throw new Error("El vehículo que intentas eliminar no existe.");
    }
    
    const customerId = vehicleDoc.data().customerId;
    if (customerId) {
        const customerRef = doc(db, 'customers', customerId);
        const customerDoc = await transaction.get(customerRef);
        if (customerDoc.exists()) {
            const currentCount = customerDoc.data().vehicleCount || 0;
            transaction.update(customerRef, { vehicleCount: Math.max(0, currentCount - 1) });
        }
    }

    // Delete the vehicle
    transaction.delete(vehicleRef);
  });
}


// Function to create a sale record
export async function createSale(data: Omit<Sale, 'id' | 'createdAt'>): Promise<string> {
  const saleId = await runTransaction(db, async (transaction) => {
    // --- READ PHASE ---
    const productRefsAndData = [];
    // Collect all product document references that need to be read
    for (const item of data.items) {
      if (item.itemType === 'product') {
        const productRef = doc(db, 'products', item.id);
        productRefsAndData.push({ ref: productRef, itemData: item });
      }
    }

    // Read all product documents in one batch
    const productDocs = await Promise.all(
        productRefsAndData.map(p => transaction.get(p.ref))
    );

    // --- VALIDATION PHASE ---
    const stockUpdatePayloads = [];
    for (let i = 0; i < productDocs.length; i++) {
        const productDoc = productDocs[i];
        const { ref, itemData } = productRefsAndData[i];

        if (!productDoc.exists()) {
            throw new Error(`Producto "${itemData.name}" no encontrado en el inventario.`);
        }

        const currentStock = productDoc.data().stock as number;
        if (currentStock < itemData.quantity) {
            throw new Error(`Stock insuficiente para "${itemData.name}". Disponible: ${currentStock}, Solicitado: ${itemData.quantity}.`);
        }

        const newStock = currentStock - itemData.quantity;
        stockUpdatePayloads.push({ ref: ref, newStock: newStock });
    }

    // --- WRITE PHASE ---
    
    // 1. Create the sale document
    const saleCol = collection(db, 'sales');
    const newSaleRef = doc(saleCol); 
    transaction.set(newSaleRef, { ...data, createdAt: serverTimestamp() });

    // 2. Update product stocks
    for (const payload of stockUpdatePayloads) {
        transaction.update(payload.ref, { stock: payload.newStock });
    }

    // 3. Update work order status if applicable
    if (data.workOrderId) {
      const workOrderRef = doc(db, 'workOrders', data.workOrderId);
      transaction.update(workOrderRef, { status: 'paid' });
    }
    
    return newSaleRef.id;
  });

  return saleId;
}

// Function to save a receipt
export async function saveReceipt(saleId: string, pdfAsBase64: string, customerId: string | null, customerName: string) {
    const receiptRef = doc(db, 'receipts', saleId);
    await setDoc(receiptRef, {
        saleId,
        customerId,
        customerName,
        pdfAsBase64,
        createdAt: serverTimestamp(),
    });
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

export async function closeCashRegister(
    sessionId: string, 
    finalAmounts: { cash: number, card: number, transfer: number },
    closedBy: { id: string, name: string },
    summary: { totalSales: number, cashSales: number, cardSales: number, transferSales: number, manualIncome: number, manualExpense: number }
) {
    const sessionRef = doc(db, 'cashRegisterSessions', sessionId);
    await updateDoc(sessionRef, {
        status: 'closed',
        finalAmount: finalAmounts.cash,
        finalAmounts: finalAmounts,
        closedAt: serverTimestamp(),
        closedBy,
        ...summary,
    });
}

export async function addCashMovement(
    sessionId: string, 
    amount: number, 
    description: string, 
    type: 'income' | 'expense',
    createdBy: { id: string, name: string }
) {
    const movementsCol = collection(db, 'cashMovements');
    await addDoc(movementsCol, {
        sessionId,
        amount,
        description,
        type,
        createdAt: serverTimestamp(),
        createdBy
    });
}

export async function migrateExistingDataToCorrelativeCodes(): Promise<{ productsUpdated: number; servicesUpdated: number }> {
    const batch = writeBatch(db);
    const countersRef = doc(db, 'settings', 'counters');
  
    const countersDoc = await getDoc(countersRef);
    let productCounter = countersDoc.exists() ? countersDoc.data().productCounter || 0 : 0;
    let serviceCounter = countersDoc.exists() ? countersDoc.data().serviceCounter || 0 : 0;
  
    // Migrate Products
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    const productsToMigrate = productsSnapshot.docs.filter(doc => !doc.data().code);
    
    productsToMigrate.forEach(productDoc => {
        productCounter++;
        const newCode = `PROD-${String(productCounter).padStart(6, '0')}`;
        batch.update(productDoc.ref, { code: newCode });
    });
  
    // Migrate Services
    const servicesRef = collection(db, 'services');
    const servicesSnapshot = await getDocs(servicesRef);
    const servicesToMigrate = servicesSnapshot.docs.filter(doc => !doc.data().code);
  
    servicesToMigrate.forEach(serviceDoc => {
        serviceCounter++;
        const newCode = `SVC-${String(serviceCounter).padStart(6, '0')}`;
        batch.update(serviceDoc.ref, { code: newCode });
    });
    
    // Update counters
    batch.set(countersRef, { productCounter, serviceCounter }, { merge: true });
  
    await batch.commit();
  
    return { productsUpdated: productsToMigrate.length, servicesUpdated: servicesToMigrate.length };
  }

// Function to create an appointment
export async function createAppointment(data: AppointmentRequestFormData) {
  const { customerId, customerName, vehicleId, vehicleDescription, service, notes, requestedDate } = data;
  
  const appointmentData = {
    customerId,
    customerName,
    vehicleId,
    vehicleDescription,
    service,
    notes: notes || '',
    requestedDate: new Date(requestedDate), // Convert ISO string to Date object for Firestore
    status: 'Pendiente',
    createdAt: serverTimestamp(),
  };

  // Add to firestore
  await addDoc(collection(db, 'appointments'), appointmentData);

  // Send notification email to workshop
  await sendAppointmentRequestEmail({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      vehicleDescription: data.vehicleDescription,
      service: data.service,
      notes: data.notes,
      requestedDate: data.requestedDate,
  });
}

// Provider Mutations
export async function createProvider(data: ProviderFormData) {
  await addDoc(collection(db, 'providers'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateProvider(id: string, data: Partial<ProviderFormData>) {
  const providerRef = doc(db, 'providers', id);
  await updateDoc(providerRef, data);
}

export async function deleteProvider(id: string) {
  const providerRef = doc(db, 'providers', id);
  await deleteDoc(providerRef);
}
