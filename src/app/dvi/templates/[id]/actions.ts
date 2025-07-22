
'use server';

import { revalidatePath } from 'next/cache';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DVITemplate } from '@/lib/types';

/**
 * Fetches a single DVI template from Firestore by its ID.
 * @param templateId The ID of the template to fetch.
 */
export async function fetchDVITemplateAction(templateId: string): Promise<DVITemplate | null> {
    try {
        if (!templateId) {
            console.error("fetchDVITemplateAction called with no ID.");
            return null;
        }
        const templateDocRef = doc(db, 'dvi-templates', templateId);
        const templateDoc = await getDoc(templateDocRef);

        if (!templateDoc.exists()) {
            console.warn(`DVI Template with id ${templateId} not found.`);
            return null;
        }
        
        return { id: templateDoc.id, ...templateDoc.data() } as DVITemplate;

    } catch (error) {
        console.error(`Error fetching DVI template ${templateId}:`, error);
        throw new Error('Failed to fetch DVI template.');
    }
}

/**
 * Updates an existing DVI template in Firestore.
 * @param template The full template object to update.
 */
export async function updateDVITemplateAction(template: DVITemplate) {
    if (!template || !template.id) {
        return { success: false, message: 'Template data or ID is missing.' };
    }

    try {
        const templateDocRef = doc(db, 'dvi-templates', template.id);
        
        // Create a copy of the template data, excluding the id field for the update payload.
        const { id, ...templateData } = template;

        await updateDoc(templateDocRef, templateData);
        
        revalidatePath(`/dvi/templates/${template.id}`);
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Template updated successfully.' };
    } catch (error) {
        console.error(`Error updating DVI template ${template.id}:`, error);
        return { success: false, message: 'Failed to update template.' };
    }
}
