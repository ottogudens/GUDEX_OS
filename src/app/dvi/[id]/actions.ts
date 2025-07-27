
'use server';

import { z, ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requireRole } from '@/lib/server-auth';
import { db, storage } from '@/lib/firebase-admin';
import { DVIUpdateSchema, DVIPhotoUploadSchema } from '@/lib/schemas';
import type { DVI } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
  url?: string;
};

/**
 * Fetches a single DVI document.
 * Accessible by staff or the customer who owns the DVI.
 */
export async function fetchDVIAction(dviId: string): Promise<DVI | null> {
    const { user } = await getAuthenticatedUser();
    
    if (!dviId) return null;
    const dviDocRef = db.collection('dvi').doc(dviId);
    const dviDoc = await dviDocRef.get();

    if (!dviDoc.exists) return null;
    
    const dvi = { id: dviDoc.id, ...dviDoc.data() } as DVI;

    // Authorization check: Allow staff or the owner of the DVI
    const isStaff = ['Administrador', 'Mecanico', 'Cajero'].includes(user.role);
    const isOwner = dvi.customer?.id === user.id;

    if (!isStaff && !isOwner) {
        throw new Error('No tienes permiso para ver esta inspección.');
    }
    
    return dvi;
}

/**
 * Updates an existing DVI document (saves progress).
 * Only Mechanics or Administrators can perform this action.
 */
export async function updateDVIAction(data: z.infer<typeof DVIUpdateSchema>): Promise<ActionResponse> {
    await requireRole(['Administrador', 'Mecanico']);

    try {
        const { id, sections } = DVIUpdateSchema.parse(data);
        const dviDocRef = db.collection('dvi').doc(id);

        await dviDocRef.update({
            sections,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        revalidatePath(`/dvi/${id}`);
        return { success: true, message: 'Progreso guardado con éxito.' };
    } catch (error) {
        console.error(`Error updating DVI:`, error);
        if (error instanceof ZodError) {
          return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        }
        return { success: false, message: 'Error al guardar el progreso.' };
    }
}

/**
 * Finalizes a DVI, setting its status to 'completed'.
 * Only Mechanics or Administrators can perform this action.
 */
export async function finalizeDVIAction(dviId: string): Promise<ActionResponse> {
    await requireRole(['Administrador', 'Mecanico']);

    if (!dviId) {
        return { success: false, message: 'ID de DVI requerido.' };
    }
    try {
        const dviDocRef = db.collection('dvi').doc(dviId);
        await dviDocRef.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
        });
        revalidatePath(`/dvi/${dviId}`);
        return { success: true, message: 'Inspección finalizada.' };
    } catch (error) {
         console.error(`Error finalizing DVI ${dviId}:`, error);
        return { success: false, message: 'Error al finalizar la inspección.' };
    }
}


/**
 * Uploads an image for a specific DVI point and adds its URL to the DVI document.
 * Only Mechanics or Administrators can perform this action.
 */
export async function uploadImageAction(formData: FormData): Promise<ActionResponse> {
    const user = await requireRole(['Administrador', 'Mecanico']);

    try {
        const validatedData = DVIPhotoUploadSchema.parse({
            file: formData.get('file'),
            dviId: formData.get('dviId'),
            pointId: formData.get('pointId'),
        });
        const { file, dviId, pointId } = validatedData;
        
        // 1. Upload file to Storage
        const filePath = `dvi/${dviId}/${pointId}/${Date.now()}-${file.name}`;
        const fileRef = storage.bucket().file(filePath);
        
        await fileRef.save(Buffer.from(await file.arrayBuffer()), {
            contentType: file.type,
        });
        
        const downloadURL = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // Far-future expiration date
        }).then(urls => urls[0]);

        // 2. Update the DVI document in Firestore
        const dviDocRef = db.collection('dvi').doc(dviId);
        const dviDoc = await dviDocRef.get();
        if (!dviDoc.exists) {
            return { success: false, message: "La inspección no existe." };
        }

        const dviData = dviDoc.data() as DVI;
        const sections = dviData.sections.map(section => ({
            ...section,
            points: section.points.map(point => {
                if (point.id === pointId) {
                    return {
                        ...point,
                        images: [...(point.images || []), downloadURL]
                    };
                }
                return point;
            })
        }));

        await dviDocRef.update({ sections });
        
        revalidatePath(`/dvi/${dviId}`);
        return { success: true, message: 'Imagen subida con éxito.', url: downloadURL };

    } catch (error) {
        console.error('Error uploading image:', error);
         if (error instanceof ZodError) {
          return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        }
        return { success: false, message: 'Error al subir la imagen.' };
    }
}
