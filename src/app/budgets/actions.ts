
'use server';

import { collection, getDocs, doc, getDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Budget, BudgetRequest, Customer, Vehicle } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export type EnrichedBudget = Budget & {
    customerName: string;
    vehicleIdentifier: string;
};

export async function fetchBudgetsAction(): Promise<EnrichedBudget[]> {
    try {
        const budgetsRef = collection(db, 'budgets');
        const budgetSnapshot = await getDocs(query(budgetsRef, orderBy('createdAt', 'desc')));
        const budgets = budgetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));

        // Inefficient N+1 fetching. This should be optimized in a real scenario,
        // possibly by denormalizing customer/vehicle names onto the budget document
        // at creation time. For now, we replicate the original logic in a server action.
        const enrichedBudgets = await Promise.all(
            budgets.map(async (budget) => {
                let customerName = 'N/A';
                let vehicleIdentifier = 'N/A';
                try {
                    const customerDoc = await getDoc(doc(db, 'customers', budget.customerId));
                    if(customerDoc.exists()) customerName = (customerDoc.data() as Customer).name;

                    const vehicleDoc = await getDoc(doc(db, 'vehicles', budget.vehicleId));
                    if(vehicleDoc.exists()) {
                        const vehicle = vehicleDoc.data() as Vehicle;
                        vehicleIdentifier = `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
                    }
                } catch (e) {
                    // Ignore errors for individual lookups to not fail the whole batch
                    console.error(`Failed to enrich budget ${budget.id}`, e);
                }
                
                return { ...budget, customerName, vehicleIdentifier };
            })
        );
        
        return enrichedBudgets;
    } catch (error) {
        console.error("Error fetching budgets:", error);
        throw new Error('Failed to fetch budgets.');
    }
}


export async function fetchBudgetRequestsAction(): Promise<BudgetRequest[]> {
     try {
        const requestsRef = collection(db, 'budgetRequests');
        const requestSnapshot = await getDocs(query(requestsRef, orderBy('createdAt', 'desc')));
        return requestSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetRequest));
    } catch (error) {
        console.error("Error fetching budget requests:", error);
        throw new Error('Failed to fetch budget requests.');
    }
}

export async function deleteBudgetAction(id: string) {
    try {
        await deleteDoc(doc(db, 'budgets', id));
        revalidatePath('/budgets');
        return { success: true, message: 'Presupuesto eliminado con éxito.' };
    } catch (error: any) {
        return { success: false, message: `Error al eliminar: ${error.message}` };
    }
}

export async function deleteBudgetRequestAction(id: string) {
    try {
        await deleteDoc(doc(db, 'budgetRequests', id));
        revalidatePath('/budgets');
        return { success: true, message: 'Solicitud eliminada con éxito.' };
    } catch (error: any) {
         return { success: false, message: `Error al eliminar: ${error.message}` };
    }
}
