
'use server';

import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { CreateDVISchema } from '@/lib/schemas'; // ¡NUEVO! Importar el esquema de Zod
import type { Vehicle, DVITemplate, DVI, DVIPointStatus, Customer } from '@/lib/types';
import { serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

// ... (fetchVehiclesAction y fetchDVITemplatesAction permanecen igual)

/**
 * Creates a new DVI document in Firestore based on a vehicle and a template.
 * Solo el personal autorizado puede crear un DVI.
 * Valida los datos de entrada usando Zod.
 */
export async function createDVIAction(params: { vehicleId: string; templateId: string; }): Promise<{ success: boolean; message: string; dviId?: string; errors?: any; }> {
    const user = await requireRole(['Administrador', 'Mecanico']);
    
    try {
        // ¡NUEVO! Validar los parámetros con Zod
        const { vehicleId, templateId } = CreateDVISchema.parse(params);

        const vehicleDocRef = db.collection('vehicles').doc(vehicleId);
        const templateDocRef = db.collection('dvi-templates').doc(templateId);

        const [vehicleDoc, templateDoc] = await Promise.all([
            vehicleDocRef.get(),
            templateDocRef.get()
        ]);

        if (!vehicleDoc.exists) {
            return { success: false, message: 'Vehicle not found.' };
        }
        if (!templateDoc.exists) {
            return { success: false, message: 'DVI Template not found.' };
        }

        const vehicle = vehicleDoc.data() as Vehicle;
        const template = templateDoc.data() as DVITemplate;

        let customerName = 'Cliente Desconocido';
        if (vehicle.customerId) {
            const customerDoc = await db.collection('customers').doc(vehicle.customerId).get();
            if (customerDoc.exists()) {
                customerName = (customerDoc.data() as Customer).name;
            }
        }
        
        const newDVI: Omit<DVI, 'id'> = {
            templateName: template.name,
            status: 'in-progress',
            inspector: {
                id: user.id,
                name: user.name,
            },
            vehicle: {
                id: vehicleDoc.id,
                make: vehicle.make,
                model: vehicle.model,
                plate: vehicle.licensePlate,
            },
            customer: {
                id: vehicle.customerId, 
                name: customerName,
            },
            sections: template.sections.map(section => ({
                ...section,
                points: section.points.map(point => ({
                    ...point,
                    status: 'ok' as DVIPointStatus,
                    notes: '',
                    images: [],
                }))
            })),
            createdAt: serverTimestamp(),
        };

        const docRef = await db.collection('dvi').add(newDVI);
        
        revalidatePath('/dvi');
        return { success: true, message: 'DVI created successfully.', dviId: docRef.id };

    } catch (error) {
        console.error("Error creating DVI:", error);

        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Datos inválidos.',
                errors: error.flatten().fieldErrors,
            };
        }
        if (error instanceof Error && error.name === 'UnauthorizedError') {
            return { success: false, message: error.message };
        }
        return { success: false, message: 'Failed to create DVI.' };
    }
}
