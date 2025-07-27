
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { DVITemplateSchema } from '@/lib/schemas';
import type { DVITemplate } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
};

/**
 * Fetches all DVI templates from Firestore.
 * Requires staff-level access.
 */
export async function fetchDVITemplatesAction(): Promise<DVITemplate[]> {
    await requireRole(['Administrador', 'Mecanico', 'Cajero']);
    
    const snapshot = await db.collection('dvi-templates').orderBy('name').get();
    
    return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
    })) as DVITemplate[];
}

/**
 * Creates a new DVI template.
 * Only Administrators can perform this action.
 */
export async function createDVITemplateAction(data: { name: string }): Promise<ActionResponse> {
    await requireRole(['Administrador']);

    try {
        const { name } = DVITemplateSchema.parse(data);

        const newTemplate = {
            name,
            sections: [], // Starts with no sections
            createdAt: FieldValue.serverTimestamp(),
        };

        await db.collection('dvi-templates').add(newTemplate);
        
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Plantilla creada con éxito.' };
    } catch (error) {
        console.error("Error creating DVI template:", error);
        if (error instanceof ZodError) {
          return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        }
        if (error instanceof Error && error.name === 'UnauthorizedError') {
            return { success: false, message: error.message };
        }
        return { success: false, message: 'Ocurrió un error al crear la plantilla.' };
    }
}

/**
 * Deletes a DVI template from Firestore.
 * Only Administrators can perform this action.
 */
export async function deleteDVITemplateAction(templateId: string): Promise<ActionResponse> {
    await requireRole(['Administrador']);
    
    if (!templateId) {
        return { success: false, message: 'ID de plantilla requerido.' };
    }
    
    try {
        const templateRef = db.collection('dvi-templates').doc(templateId);

        if (!(await templateRef.get()).exists) {
            return { success: false, message: 'La plantilla no existe.' };
        }
        
        // Opcional: Verificar si alguna inspección DVI está usando esta plantilla
        const dviQuery = db.collection('dvi').where('templateName', '==', (await templateRef.get()).data()?.name).limit(1);
        if (!(await dviQuery.get()).empty) {
            return { success: false, message: 'No se puede eliminar. Plantilla en uso por una o más inspecciones.' };
        }

        await templateRef.delete();
        
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Plantilla eliminada con éxito.' };
    } catch (error) {
        console.error("Error deleting DVI template:", error);
        if (error instanceof Error && error.name === 'UnauthorizedError') {
            return { success: false, message: error.message };
        }
        return { success: false, message: 'Ocurrió un error al eliminar la plantilla.' };
    }
}
