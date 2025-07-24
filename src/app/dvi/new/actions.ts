
'use server';

import { collection, getDocs, query, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vehicle, DVITemplate, User, DVI, DVIPointStatus, Customer } from '@/lib/types';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Fetches all Vehicles from Firestore.
 */
export async function fetchVehiclesAction(): Promise<Vehicle[]> {
    try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef);
        const querySnapshot = await getDocs(q);
        
        const vehicles: Vehicle[] = [];
        querySnapshot.forEach((doc) => {
            vehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
        });
        
        return vehicles;
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        throw new Error('Failed to fetch vehicles.');
    }
}

/**
 * Creates a new DVI document in Firestore based on a vehicle and a template.
 */
export async function createDVIAction(params: { vehicle: Vehicle; template: DVITemplate; user: User; }): Promise<{ success: boolean; message: string; dviId?: string; }> {
    const { vehicle, template, user } = params;

    if (!vehicle || !template || !user) {
        return { success: false, message: 'Vehicle, template, and user are required.' };
    }

    try {
        // Fetch customer data to get the name
        let customerName = 'Cliente Desconocido';
        try {
            const customerDocRef = doc(db, 'customers', vehicle.customerId);
            const customerDoc = await getDoc(customerDocRef);
            if (customerDoc.exists()) {
                customerName = (customerDoc.data() as Customer).name;
            }
        } catch (e) {
            console.error("Could not fetch customer name for DVI:", e);
        }

        // Construct the DVI object from the template
        const newDVI: Omit<DVI, 'id'> = {
            templateName: template.name,
            status: 'in-progress',
            inspector: {
                id: user.id!,
                name: user.name,
            },
            vehicle: {
                id: vehicle.id,
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
                    status: 'ok' as DVIPointStatus, // Default status
                    notes: '',
                    images: [],
                }))
            })),
            createdAt: serverTimestamp() as any,
        };

        const docRef = await addDoc(collection(db, 'dvi'), newDVI);
        
        return { success: true, message: 'DVI created successfully.', dviId: docRef.id };

    } catch (error) {
        console.error("Error creating DVI:", error);
        return { success: false, message: 'Failed to create DVI.' };
    }
}


/**
 * Fetches all DVI templates from Firestore.
 */
export async function fetchDVITemplatesAction(): Promise<DVITemplate[]> {
    try {
        const templatesRef = collection(db, 'dvi-templates');
        const q = query(templatesRef);
        const querySnapshot = await getDocs(q);
        
        const templates: DVITemplate[] = [];
        querySnapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() } as DVITemplate);
        });
        
        return templates;
    } catch (error) {
        console.error("Error fetching DVI templates:", error);
        throw new Error('Failed to fetch DVI templates.');
    }
}
