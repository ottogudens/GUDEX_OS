
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { BudgetSchema } from '@/lib/budget-schema';
import type { Budget, BudgetRequest, Customer, Vehicle } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
  budgetId?: string;
};

// Hemos desnormalizado los datos, por lo que la consulta ahora es mucho más simple
// y no necesita un tipo "EnrichedBudget"
export async function fetchBudgetsAction(): Promise<Budget[]> {
  await requireRole(['Administrador', 'Mecanico', 'Cajero']);
  
  const snapshot = await db.collection('budgets').orderBy('createdAt', 'desc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Budget[];
}

export async function fetchBudgetRequestsAction(): Promise<BudgetRequest[]> {
  await requireRole(['Administrador', 'Mecanico', 'Cajero']);

  const snapshot = await db.collection('budgetRequests').orderBy('createdAt', 'desc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BudgetRequest[];
}

export async function createBudgetAction(data: z.infer<typeof BudgetSchema>): Promise<ActionResponse> {
  const user = await requireRole(['Administrador', 'Cajero']);

  try {
    const validatedData = BudgetSchema.parse(data);
    const { customerId, vehicleId, items } = validatedData;

    // Obtener datos para desnormalizar
    const customerDoc = await db.collection('customers').doc(customerId).get();
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();

    if (!customerDoc.exists || !vehicleDoc.exists) {
      return { success: false, message: 'El cliente o el vehículo no existen.' };
    }
    const customer = customerDoc.data() as Customer;
    const vehicle = vehicleDoc.data() as Vehicle;

    // Calcular totales
    const subtotal = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const total = subtotal; // Aquí podrías añadir impuestos o descuentos

    const newBudget = {
      ...validatedData,
      subtotal,
      total,
      // --- Datos Desnormalizados ---
      customer: {
        name: customer.name,
        email: customer.email,
      },
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
      },
      // --- Fin de Datos Desnormalizados ---
      createdBy: {
          id: user.id,
          name: user.name,
      },
      createdAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await db.collection('budgets').add(newBudget);

    revalidatePath('/budgets');
    return { success: true, message: 'Presupuesto creado con éxito.', budgetId: docRef.id };

  } catch (error) {
    console.error("Error creating budget:", error);
    if (error instanceof ZodError) {
      return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    }
    if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'Ocurrió un error al crear el presupuesto.' };
  }
}

export async function deleteBudgetAction(id: string): Promise<ActionResponse> {
  await requireRole(['Administrador']);

  try {
    const budgetRef = db.collection('budgets').doc(id);
    if (!(await budgetRef.get()).exists) {
        return { success: false, message: 'El presupuesto no existe.' };
    }
    await budgetRef.delete();
    
    revalidatePath('/budgets');
    return { success: true, message: 'Presupuesto eliminado con éxito.' };
  } catch (error: any) {
     if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: `Error al eliminar: ${error.message}` };
  }
}

export async function deleteBudgetRequestAction(id: string): Promise<ActionResponse> {
  await requireRole(['Administrador', 'Cajero']);

  try {
    const requestRef = db.collection('budgetRequests').doc(id);
     if (!(await requestRef.get()).exists) {
        return { success: false, message: 'La solicitud no existe.' };
    }
    await requestRef.delete();
    
    revalidatePath('/budgets');
    return { success: true, message: 'Solicitud eliminada con éxito.' };
  } catch (error: any) {
    if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: `Error al eliminar: ${error.message}` };
  }
}
