
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { CustomerSchema } from '@/lib/schemas';
import type { Customer } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
};

/**
 * Fetches all Customers from Firestore.
 * Requires staff-level access.
 */
export async function fetchCustomersAction(): Promise<Customer[]> {
  await requireRole(['Administrador', 'Mecanico', 'Cajero']);
  
  const snapshot = await db.collection('customers').orderBy('name').get();
  
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Customer[];
}

/**
 * Creates a new customer.
 * Accessible by staff.
 */
export async function createCustomerAction(data: z.infer<typeof CustomerSchema>): Promise<ActionResponse> {
  await requireRole(['Administrador', 'Mecanico', 'Cajero']);
  
  try {
    const validatedData = CustomerSchema.parse(data);

    // Check if a customer with this email already exists
    const existingCustomer = await db.collection('customers').where('email', '==', validatedData.email).limit(1).get();
    if (!existingCustomer.empty) {
      return { success: false, message: 'Ya existe un cliente con este correo electrónico.' };
    }

    const newCustomer = {
      ...validatedData,
      vehicleCount: 0,
      lastVisit: 'N/A',
      memberSince: new Date().toISOString().split('T')[0],
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('customers').add(newCustomer);

    revalidatePath('/customers');
    return { success: true, message: 'Cliente creado con éxito.' };
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof ZodError) {
      return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    }
    return { success: false, message: 'Ocurrió un error al crear el cliente.' };
  }
}

/**
 * Updates an existing customer.
 * Only Administrators can perform this action.
 */
export async function updateCustomerAction(id: string, data: z.infer<typeof CustomerSchema>): Promise<ActionResponse> {
  await requireRole(['Administrador']);
  
  try {
    const validatedData = CustomerSchema.parse(data);
    const customerRef = db.collection('customers').doc(id);

    if (!(await customerRef.get()).exists) {
        return { success: false, message: 'El cliente no existe.' };
    }
    
    // Check if another customer has the new email
    if(data.email) {
        const existingCustomer = await db.collection('customers').where('email', '==', data.email).limit(1).get();
        if (!existingCustomer.empty && existingCustomer.docs[0].id !== id) {
            return { success: false, message: 'El correo electrónico ya está en uso por otro cliente.' };
        }
    }

    await customerRef.update({
        ...validatedData,
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return { success: true, message: 'Cliente actualizado con éxito.' };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    }
    return { success: false, message: 'Ocurrió un error al actualizar el cliente.' };
  }
}

/**
 * Deletes a customer.
 * Only Administrators can perform this action.
 * Fails if the customer has associated vehicles.
 */
export async function deleteCustomerAction(id: string): Promise<ActionResponse> {
  await requireRole(['Administrador']);
  
  try {
    const customerRef = db.collection('customers').doc(id);
    const vehiclesQuery = db.collection('vehicles').where('customerId', '==', id).limit(1);

    const [customerDoc, vehiclesSnapshot] = await Promise.all([
        customerRef.get(),
        vehiclesQuery.get()
    ]);

    if (!customerDoc.exists) {
      return { success: false, message: 'El cliente no existe.' };
    }

    if (!vehiclesSnapshot.empty) {
      return { success: false, message: 'No se puede eliminar. El cliente tiene vehículos asociados.' };
    }

    await customerRef.delete();

    revalidatePath('/customers');
    return { success: true, message: 'Cliente eliminado con éxito.' };
  } catch (error: any) {
    return { success: false, message: 'Ocurrió un error al eliminar el cliente.' };
  }
}
