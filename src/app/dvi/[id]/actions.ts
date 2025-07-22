
'use server';

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { DVI } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetches a single DVI document from Firestore.
 * @param dviId The ID of the DVI to fetch.
 */
export async function fetchDVIAction(dviId: string): Promise<DVI | null> {
    try {
        if (!dviId) return null;
        const dviDocRef = doc(db, 'dvi', dviId);
        const dviDoc = await getDoc(dviDocRef);

        if (!dviDoc.exists()) return null;
        
        return { id: dviDoc.id, ...dviDoc.data() } as DVI;

    } catch (error) {
        console.error(`Error fetching DVI ${dviId}:`, error);
        throw new Error('Failed to fetch DVI.');
    }
}

/**
 * Updates an existing DVI document in Firestore.
 * @param dvi The full DVI object with updated data.
 */
export async function updateDVIAction(dvi: DVI) {
    if (!dvi || !dvi.id) {
        return { success: false, message: 'DVI data or ID is missing.' };
    }

    try {
        const dviDocRef = doc(db, 'dvi', dvi.id);
        const { id, ...dviData } = dvi;

        await updateDoc(dviDocRef, dviData);
        
        revalidatePath(`/dvi/${dvi.id}`);
        return { success: true, message: 'Progress saved successfully.' };
    } catch (error) {
        console.error(`Error updating DVI ${dvi.id}:`, error);
        return { success: false, message: 'Failed to save progress.' };
    }
}

/**
 * Finalizes a DVI, setting its status to 'completed'.
 * @param dviId The ID of the DVI to finalize.
 */
export async function finalizeDVIAction(dviId: string) {
    if (!dviId) {
        return { success: false, message: 'DVI ID is missing.' };
    }
    try {
        const dviDocRef = doc(db, 'dvi', dviId);
        await updateDoc(dviDocRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
        });
        revalidatePath(`/dvi/${dviId}`);
        return { success: true, message: 'Inspection finalized.' };
    } catch (error) {
         console.error(`Error finalizing DVI ${dviId}:`, error);
        return { success: false, message: 'Failed to finalize inspection.' };
    }
}


/**
 * Uploads an image file to Firebase Storage for a specific DVI point.
 * @param dviId The ID of the DVI document.
 * @param pointId The ID of the inspection point.
 * @param file The image file to upload.
 */
export async function uploadImageAction(formData: FormData): Promise<{ success: boolean; message: string; url?: string; }> {
    const file = formData.get('file') as File;
    const dviId = formData.get('dviId') as string;
    const pointId = formData.get('pointId') as string;

    if (!file || !dviId || !pointId) {
        return { success: false, message: 'Missing required data for upload.' };
    }

    try {
        const storageRef = ref(storage, `dvi/${dviId}/${pointId}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { success: true, message: 'Image uploaded successfully.', url: downloadURL };

    } catch (error) {
        console.error('Error uploading image:', error);
        return { success: false, message: 'Failed to upload image.' };
    }
}
