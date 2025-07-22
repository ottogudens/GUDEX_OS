
'use server';

import { revalidatePath } from 'next/cache';
import { collection, addDoc, getDocs, deleteDoc, doc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DVITemplate } from '@/lib/types';

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

/**
 * Creates a new DVI template in Firestore.
 * @param name The name of the new template.
 */
export async function createDVITemplateAction(name: string) {
    if (!name || name.trim() === '') {
        return { success: false, message: 'Template name cannot be empty.' };
    }
    
    try {
        const newTemplate: Omit<DVITemplate, 'id'> = {
            name,
            sections: [], // Starts with no sections
        };
        await addDoc(collection(db, 'dvi-templates'), newTemplate);
        
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Template created successfully.' };
    } catch (error) {
        console.error("Error creating DVI template:", error);
        return { success: false, message: 'Failed to create template.' };
    }
}

/**
 * Deletes a DVI template from Firestore.
 * @param templateId The ID of the template to delete.
 */
export async function deleteDVITemplateAction(templateId: string) {
    if (!templateId) {
        return { success: false, message: 'Template ID is required.' };
    }
    
    try {
        await deleteDoc(doc(db, 'dvi-templates', templateId));
        
        revalidatePath('/dvi/templates');
        return { success: true, message: 'Template deleted successfully.' };
    } catch (error) {
        console.error("Error deleting DVI template:", error);
        return { success: false, message: 'Failed to delete template.' };
    }
}
