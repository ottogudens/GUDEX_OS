
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { DVITemplateUpdateSchema } from '@/lib/schemas';
import type { DVITemplate } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Fetches a single DVI template from Firestore by its ID.
 * Requires staff-level access.
 */
export async function fetchDVITemplateAction(templateId: string): Promise<DVITemplate | null> {
    await requireRole(['Administrador', 'Mecanico', 'Cajero']);
    
    if (!templateId) return null;

    const templateDocRef = db.collection('dvi-templates').doc(templateId);
    const templateDoc = await templateDocRef.get();

    if (!templateDoc.exists()) return null;
    
    return { id: templateDoc.id, ...templateDoc.data() } as DVITemplate;
}

/**
 * Updates an existing DVI template in Firestore.
 * Only Administrators can perform this action.
 */
export async function updateDVITemplateAction(templateData: z.infer<typeof DVITemplateUpdateSchema>) {
    await requireRole(['Administrador']);

    try {
        const { id, ...dataToUpdate } = DVITemplateUpdateSchema.parse(templateData);
        
        const templateDocRef = db.collection('dvi-templates').doc(id);

        if (!(await templateDocRef.get()).exists) {
            return { success: false, message: 'La plantilla no existe.' };
        }

        await templateDocRef.update({
            ...dataToUpdate,
            updatedAt: FieldValue.serverTimestamp()
        });
        
        revalidatePath(`/dvi/templates/${id}`);
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Plantilla actualizada con éxito.' };
    } catch (error) {
        console.error(`Error updating DVI template:`, error);
        if (error instanceof ZodError) {
            return { success: false, message: 'Datos inválidos.', errors: error.flatten().fieldErrors };
        }
        return { success: false, message: 'Ocurrió un error al actualizar la plantilla.' };
    }
}
