
'use client';
// This file contains functions to fetch data from your data source.
// It is now connected to Firebase Firestore.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  startOfMonth,
  endOfMonth,
  getCountFromServer,
  deleteDoc,
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './firebase';
import type { Customer, Service, ServiceHistory, User, Vehicle, Product, WorkshopSettings, ServiceCategory, Camera, WorkOrder, Receipt, DashboardData, Sale, SalesSummaryData, BestSeller, CashRegisterSession, CashMovement, ProductCategory, EmailSettings, SentEmail, EmailLog, StockLog, Provider, Budget, Appointment, BudgetRequest } from './types';
import { subMonths, format, startOfDay } from 'date-fns';

// NOTE: For these functions to work, you must create the necessary collections
// in your Firestore database named 'users', 'customers', 'vehicles', etc.
// and populate them with some initial data matching the types in src/lib/types.ts.
// The document ID from Firestore will be used as the 'id' field.

export async function fetchCustomers(): Promise<Customer[]> {
    noStore();
    try {
        const customersCol = collection(db, 'customers');
        const customerSnapshot = await getDocs(customersCol);
        const customerList = customerSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Customer[];
        return customerList;
    } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
}

export async function fetchProducts(): Promise<Product[]> {
    noStore();
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(query(productsCol, orderBy("name")));
        const productList = productSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Product[];
        return productList;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
    noStore();
    try {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, where('barcode', '==', barcode), limit(1));
        const productSnapshot = await getDocs(q);

        if (productSnapshot.empty) {
            return null;
        }

        const productDoc = productSnapshot.docs[0];
        return {
            id: productDoc.id,
            ...productDoc.data()
        } as Product;

    } catch (error) {
        console.error('Error fetching product by barcode:', error);
        throw new Error('Could not fetch product.');
    }
}

export async function fetchServices(): Promise<Service[]> {
    noStore();
    try {
        const servicesCol = collection(db, 'services');
        const serviceSnapshot = await getDocs(query(servicesCol, orderBy("name")));
        const serviceList = serviceSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Service[];
        return serviceList;
    } catch (error) {
        console.error('Error fetching services:', error);
        return [];
    }
}

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
    noStore();
    try {
        const categoriesCol = collection(db, 'serviceCategories');
        const categorySnapshot = await getDocs(query(categoriesCol, orderBy("name")));
        const categoryList = categorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as ServiceCategory[];
        
        const categoryMap = new Map<string, ServiceCategory>();
        const rootCategories: ServiceCategory[] = [];

        categoryList.forEach(category => {
            category.subcategories = [];
            categoryMap.set(category.id, category);
        });

        categoryList.forEach(category => {
            if (category.parentId && categoryMap.has(category.parentId)) {
                const parent = categoryMap.get(category.parentId)!;
                parent.subcategories?.push(category);
            } else {
                rootCategories.push(category);
            }
        });

        return rootCategories;

    } catch (error) {
        console.error('Error fetching service categories:', error);
        return [];
    }
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
    noStore();
    try {
        const categoriesCol = collection(db, 'productCategories');
        const categorySnapshot = await getDocs(query(categoriesCol, orderBy("name")));
        const categoryList = categorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as ProductCategory[];
        
        const categoryMap = new Map<string, ProductCategory>();
        const rootCategories: ProductCategory[] = [];

        categoryList.forEach(category => {
            category.subcategories = [];
            categoryMap.set(category.id, category);
        });

        categoryList.forEach(category => {
            if (category.parentId && categoryMap.has(category.parentId)) {
                const parent = categoryMap.get(category.parentId)!;
                parent.subcategories?.push(category);
            } else {
                rootCategories.push(category);
            }
        });

        return rootCategories;

    } catch (error) {
        console.error('Error fetching product categories:', error);
        return [];
    }
}

export async function fetchCameras(): Promise<Camera[]> {
    noStore();
    try {
        const camerasCol = collection(db, 'cameras');
        const cameraSnapshot = await getDocs(query(camerasCol, orderBy("name")));
        const cameraList = cameraSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Camera[];
        return cameraList;
    } catch (error) {
        console.error('Error fetching cameras:', error);
        return [];
    }
}


export async function fetchUserById(id: string): Promise<User | null> {
    noStore();
    try {
        const userDocRef = doc(db, 'users', id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.warn(`No matching user found in Firestore for id: ${id}`);
            return null;
        }

        return {
            id: userDoc.id,
            ...userDoc.data(),
        } as User;

    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return null;
    }
}

export async function fetchUsers(): Promise<User[]> {
    noStore();
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as User[];
        return userList;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function fetchCustomerById(id: string): Promise<Customer | undefined> {
    noStore();
    if (!id) return undefined;
    try {
        const customerDocRef = doc(db, 'customers', id);
        const customerDoc = await getDoc(customerDocRef);
        if (!customerDoc.exists()) {
            return undefined;
        }
        return { id: customerDoc.id, ...customerDoc.data() } as Customer;
    } catch (error) {
        console.error('Error fetching customer by ID:', error);
        return undefined;
    }
}

export async function fetchVehicleById(id: string): Promise<Vehicle | undefined> {
    noStore();
    if (!id) return undefined;
    try {
        const vehicleDocRef = doc(db, 'vehicles', id);
        const vehicleDoc = await getDoc(vehicleDocRef);
        if (!vehicleDoc.exists()) {
            return undefined;
        }
        return { id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle;
    } catch (error) {
        console.error('Error fetching vehicle by ID:', error);
        return undefined;
    }
}

export async function fetchVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    noStore();
    try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('customerId', '==', customerId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Vehicle[];
    } catch (error) {
        console.error('Error fetching vehicles by customer ID:', error);
        return [];
    }
}

export async function fetchAllVehicles(): Promise<(Vehicle & { customerName: string })[]> {
    noStore();
    try {
        const vehiclesCol = collection(db, 'vehicles');
        const vehicleSnapshot = await getDocs(query(vehiclesCol, orderBy("make")));
        const vehicleList = vehicleSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Vehicle[];
        
        if (vehicleList.length === 0) return [];
        
        const customerIds = [...new Set(vehicleList.map(v => v.customerId))];
        const customerMap = new Map<string, string>();
        
        // Firestore 'in' query has a limit of 30 items. For a real app, this might need chunking.
        const customerIdChunks: string[][] = [];
        for (let i = 0; i < customerIds.length; i += 30) {
            customerIdChunks.push(customerIds.slice(i, i + 30));
        }

        for (const chunk of customerIdChunks) {
            const customersCol = collection(db, 'customers');
            const customersQuery = query(customersCol, where('__name__', 'in', chunk));
            const customerSnapshot = await getDocs(customersQuery);
            customerSnapshot.docs.forEach(doc => {
                customerMap.set(doc.id, doc.data().name);
            });
        }
        
        return vehicleList.map(vehicle => ({
            ...vehicle,
            customerName: customerMap.get(vehicle.customerId) || 'Cliente Desconocido',
        }));

    } catch (error) {
        console.error('Error fetching all vehicles:', error);
        return [];
    }
}


export async function fetchServiceHistoryByVehicleIds(vehicleIds: string[]): Promise<{ serviceHistory: ServiceHistory[], vehicles: Vehicle[] }> {
    noStore();
    if (vehicleIds.length === 0) {
        return { serviceHistory: [], vehicles: [] };
    }
    try {
        // Fetch service history
        const historyRef = collection(db, 'serviceHistory');
        const qHistory = query(historyRef, where('vehicleId', 'in', vehicleIds));
        const historySnapshot = await getDocs(qHistory);
        const serviceHistory = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceHistory[];

        // Fetch vehicle details
        // Note: Firestore 'in' query is limited to 30 items. For larger scale, you might need multiple queries.
        const vehiclesRef = collection(db, 'vehicles');
        const qVehicles = query(vehiclesRef, where('__name__', 'in', vehicleIds));
        const vehiclesSnapshot = await getDocs(qVehicles);
        const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Vehicle[];

        return { serviceHistory, vehicles };
    } catch (error) {
        console.error('Error fetching service history:', error);
        return { serviceHistory: [], vehicles: [] };
    }
}

export async function createUserProfile(uid: string, name: string, email: string, phone?: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    // If user document does not exist (standard registration), create it with 'Cliente' role.
    // If it exists (e.g., pre-created by an admin), its role is preserved.
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        name,
        email,
        role: 'Cliente',
      });
    }

    // Create or update the corresponding customer document
    const customerDocRef = doc(db, 'customers', uid);
    await setDoc(customerDocRef, {
      name,
      email,
      phone: phone || '',
      vehicleCount: 0,
      lastVisit: 'N/A',
      memberSince: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    }, { merge: true }); // Use merge to not overwrite existing customer data

  } catch (error) {
    console.error('Error creating user profile and customer:', error);
    throw error;
  }
}

export async function fetchWorkshopSettings(): Promise<WorkshopSettings> {
  noStore();
  const defaultSettings: WorkshopSettings = {
    name: 'GUDEX-OS',
    rut: '',
    address: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    logoUrl: 'https://placehold.co/200x66.png',
  };

  try {
    const settingsDocRef = doc(db, 'settings', 'profile');
    const settingsDoc = await getDoc(settingsDocRef);

    if (!settingsDoc.exists()) {
      console.warn("Workshop settings not found, returning default settings.");
      return defaultSettings;
    }
    
    return { id: 'profile', ...settingsDoc.data() } as WorkshopSettings;

  } catch (error) {
    console.error("Error fetching workshop settings:", error);
    return defaultSettings;
  }
}

export async function fetchEmailSettings(): Promise<EmailSettings> {
  noStore();
  const defaultSettings: EmailSettings = {
    host: '', port: 465, user: '', pass: '', from: '', secure: true
  };

  try {
    const settingsDocRef = doc(db, 'settings', 'email');
    const settingsDoc = await getDoc(settingsDocRef);

    if (!settingsDoc.exists()) {
      console.warn("Email settings not found, returning default settings.");
      return defaultSettings;
    }
    
    const data = settingsDoc.data();
    return { ...defaultSettings, ...data, id: 'email' } as EmailSettings;

  } catch (error) {
    console.error("Error fetching email settings:", error);
    return defaultSettings;
  }
}

export async function fetchWorkOrders(status?: WorkOrder['status']): Promise<WorkOrder[]> {
    noStore();
    try {
        const workOrdersCol = collection(db, 'workOrders');
        let q;
        if (status) {
            q = query(workOrdersCol, where('status', '==', status), orderBy('createdAt', 'desc'));
        } else {
            q = query(workOrdersCol, orderBy('createdAt', 'desc'));
        }
        
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as WorkOrder[];
        return list;
    } catch (error) {
        console.error('Error fetching work orders:', error);
        return [];
    }
}

export async function fetchReceipts(): Promise<Receipt[]> {
    noStore();
    try {
        const receiptsCol = collection(db, 'receipts');
        const q = query(receiptsCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Receipt[];
        return list;
    } catch (error) {
        console.error('Error fetching receipts:', error);
        return [];
    }
}

export async function fetchReceiptsByCustomerId(customerId: string): Promise<Receipt[]> {
    noStore();
    if (!customerId) return [];
    try {
        const receiptsCol = collection(db, 'receipts');
        const q = query(receiptsCol, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Receipt[];
        return list;
    } catch (error) {
        console.error('Error fetching receipts by customer:', error);
        return [];
    }
}

export async function fetchWorkOrdersByCustomerId(customerId: string): Promise<WorkOrder[]> {
    noStore();
    if (!customerId) return [];
    try {
        const workOrdersCol = collection(db, 'workOrders');
        const q = query(workOrdersCol, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as WorkOrder[];
        return list;
    } catch (error) {
        console.error('Error fetching work orders by customer:', error);
        return [];
    }
}


export async function fetchDashboardData(): Promise<DashboardData> {
  noStore();
  try {
    // 1. Total Revenue
    const salesCol = collection(db, 'sales');
    const salesSnapshot = await getDocs(salesCol);
    const salesData = salesSnapshot.docs.map(doc => doc.data() as Sale);
    const totalRevenue = salesData.reduce((acc, sale) => acc + sale.total, 0);

    // 2. Active Orders
    const workOrdersCol = collection(db, 'workOrders');
    const activeOrdersQuery = query(workOrdersCol, where('status', 'in', ['backlog', 'inProgress', 'approval']));
    const activeOrdersSnapshot = await getCountFromServer(activeOrdersQuery);
    const activeOrders = activeOrdersSnapshot.data().count;

    // 3. Completed This Month & New Customers This Month
    const today = new Date();
    const oneMonthAgo = startOfDay(subMonths(today, 1));
    const oneMonthAgoTimestamp = Timestamp.fromDate(oneMonthAgo);

    const completedThisMonthQuery = query(collection(db, 'sales'), where('createdAt', '>=', oneMonthAgoTimestamp));
    const completedThisMonthSnapshot = await getCountFromServer(completedThisMonthQuery);
    const completedThisMonth = completedThisMonthSnapshot.data().count;

    const newCustomersThisMonthQuery = query(collection(db, 'customers'), where('createdAt', '>=', oneMonthAgoTimestamp));
    const newCustomersThisMonthSnapshot = await getCountFromServer(newCustomersThisMonthQuery);
    const newCustomersThisMonth = newCustomersThisMonthSnapshot.data().count;

    // 4. Monthly Revenue for Chart
    const sixMonthsAgo = subMonths(today, 5);
    const monthlyRevenue: { [key: string]: number } = {};
    const monthLabels: string[] = [];

    for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(today, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthLabels.unshift(format(monthDate, 'MMM'));
        monthlyRevenue[monthKey] = 0;
    }

    const recentSalesQuery = query(salesCol, where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)));
    const recentSalesSnapshot = await getDocs(recentSalesQuery);
    recentSalesSnapshot.forEach(doc => {
      const sale = doc.data() as Sale;
      if (sale.createdAt) {
        const monthKey = format(sale.createdAt.toDate(), 'yyyy-MM');
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += sale.total;
        }
      }
    });
    
    const chartData = Object.entries(monthlyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month: format(new Date(month), 'MMM'), revenue }));

    // 5. Recent Activity
    const recentActivityQuery = query(workOrdersCol, orderBy('createdAt', 'desc'), limit(5));
    const recentActivitySnapshot = await getDocs(recentActivityQuery);
    const recentActivity = recentActivitySnapshot.docs.map(doc => {
        const data = doc.data() as WorkOrder;
        return {
            id: doc.id.slice(-6).toUpperCase(),
            vehicle: data.vehicle,
            customer: data.customer,
            status: data.status,
        };
    });

    return {
      totalRevenue,
      activeOrders,
      completedThisMonth,
      newCustomersThisMonth,
      monthlyRevenue: chartData,
      recentActivity
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Return default/empty state on error
    return {
      totalRevenue: 0,
      activeOrders: 0,
      completedThisMonth: 0,
      newCustomersThisMonth: 0,
      monthlyRevenue: [],
      recentActivity: []
    };
  }
}

export async function fetchAppointmentsByDate(date: Date): Promise<Appointment[]> {
    noStore();
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const appointmentsCol = collection(db, 'appointments');
        const q = query(
            appointmentsCol,
            where('requestedDate', '>=', Timestamp.fromDate(startOfDay)),
            where('requestedDate', '<=', Timestamp.fromDate(endOfDay)),
            orderBy('requestedDate', 'asc') // Order by time
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requestedDate: (doc.data().requestedDate as Timestamp).toDate().toISOString(), // Convert Timestamp back to string
        })) as Appointment[];
    } catch (error) {
        console.error('Error fetching appointments by date:', error);
        return [];
    }
}

export async function fetchSalesSummary(
  startDate?: Date,
  endDate?: Date
): Promise<SalesSummaryData> {
  noStore();
  try {
    const salesCol = collection(db, 'sales');
    let q;

    if (startDate && endDate) {
      // Adjust endDate to include the whole day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      q = query(
        salesCol,
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endOfDay),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(salesCol, orderBy('createdAt', 'desc'), limit(50)); // Limit initial load
    }

    const snapshot = await getDocs(q);
    const sales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Sale[];
    
    // Calculate summary data
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
    const averageSale = sales.length > 0 ? totalSales / sales.length : 0;
    
    // Calculate best sellers from the fetched sales
    const itemCounts: { [key: string]: BestSeller } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = `${item.itemType}-${item.id}`;
        if (itemCounts[key]) {
          itemCounts[key].quantity += item.quantity;
        } else {
          itemCounts[key] = {
            name: item.name,
            quantity: item.quantity,
          };
        }
      });
    });

    const bestSellers = Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10

    return { sales, bestSellers, totalSales, averageSale };
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return { sales: [], bestSellers: [], totalSales: 0, averageSale: 0 };
  }
}

export async function fetchActiveCashRegisterSession(): Promise<CashRegisterSession | null> {
    noStore();
    try {
        const sessionsCol = collection(db, 'cashRegisterSessions');
        const q = query(sessionsCol, where('status', '==', 'open'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as CashRegisterSession;
    } catch (error) {
        console.error('Error fetching active cash register session:', error);
        return null;
    }
}

export async function fetchClosedCashRegisterSessions(): Promise<CashRegisterSession[]> {
    noStore();
    try {
        const sessionsCol = collection(db, 'cashRegisterSessions');
        const q = query(sessionsCol, where('status', '==', 'closed'), orderBy('closedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CashRegisterSession[];
    } catch (error) {
        console.error('Error fetching closed cash register sessions:', error);
        return [];
    }
}


export async function fetchSalesBySessionId(sessionId: string): Promise<Sale[]> {
    noStore();
    try {
        const salesCol = collection(db, 'sales');
        const q = query(salesCol, where('cashRegisterSessionId', '==', sessionId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
    } catch (error) {
        console.error('Error fetching sales by session ID:', error);
        return [];
    }
}

export async function fetchMovementsBySessionId(sessionId: string): Promise<CashMovement[]> {
    noStore();
    try {
        const movementsCol = collection(db, 'cashMovements');
        const q = query(movementsCol, where('sessionId', '==', sessionId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CashMovement[];
    } catch (error) {
        console.error('Error fetching cash movements by session ID:', error);
        return [];
    }
}

export async function fetchSentEmails(): Promise<SentEmail[]> {
    noStore();
    try {
        const emailsCol = collection(db, 'sentEmails');
        const q = query(emailsCol, orderBy('sentAt', 'desc'), limit(100)); // Limit to last 100
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as SentEmail[];
    } catch (error) {
        console.error('Error fetching sent emails:', error);
        return [];
    }
}

export async function fetchEmailLogs(): Promise<EmailLog[]> {
    noStore();
    try {
        const logsCol = collection(db, 'emailLogs');
        const q = query(logsCol, orderBy('createdAt', 'desc'), limit(100)); // Limit to last 100
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as EmailLog[];
    } catch (error) {
        console.error('Error fetching email logs:', error);
        return [];
    }
}

export async function fetchStockLogs(): Promise<StockLog[]> {
    noStore();
    try {
        const logsCol = collection(db, 'stockLogs');
        const q = query(logsCol, orderBy('createdAt', 'desc'), limit(100)); // Limit to last 100
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as StockLog[];
    } catch (error) {
        console.error('Error fetching stock logs:', error);
        return [];
    }
}

export async function fetchProviders(): Promise<Provider[]> {
    noStore();
    try {
        const providersCol = collection(db, 'providers');
        const providerSnapshot = await getDocs(query(providersCol, orderBy("name")));
        const providerList = providerSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Provider[];
        return providerList;
    } catch (error) {
        console.error('Error fetching providers:', error);
        return [];
    }
}

export async function fetchBudgets(): Promise<Budget[]> {
    noStore();
    try {
        const budgetsCol = collection(db, 'budgets');
        const q = query(budgetsCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Budget[];
        return list;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        return [];
    }
}

export async function fetchBudgetRequests(): Promise<BudgetRequest[]> {
    noStore();
    try {
        const requestsCol = collection(db, 'budgetRequests');
        const q = query(requestsCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as BudgetRequest[];
        return list;
    } catch (error) {
        console.error('Error fetching budget requests:', error);
        return [];
    }
}

export async function deleteBudget(id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'budgets', id));
    } catch (error) {
        console.error("Error deleting budget:", error);
        throw new Error("No se pudo eliminar el presupuesto.");
    }
}

export async function deleteBudgetRequest(id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'budgetRequests', id));
    } catch (error) {
        console.error("Error deleting budget request:", error);
        throw new Error("No se pudo eliminar la solicitud de presupuesto.");
    }
}

export async function fetchBudgetsByCustomerId(customerId: string): Promise<Budget[]> {
    noStore();
    try {
        const budgetsCol = collection(db, 'budgets');
        const q = query(budgetsCol, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Budget[];
        return list;
    } catch (error) {
        console.error('Error fetching budgets by customer:', error);
        return [];
    }
}

export async function updateBudgetStatus(budgetId: string, status: 'Aprobado' | 'Rechazado') {
  const budgetRef = doc(db, 'budgets', budgetId);
  await updateDoc(budgetRef, {
    status: status,
    updatedAt: serverTimestamp(),
  });
}
