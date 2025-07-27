
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { ProductCategorySchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
};

/**
 * Creates a new product category. Only Administrators can perform this action.
 */
export async function createCategoryAction(data: z.infer<typeof ProductCategorySchema>): Promise<ActionResponse> {
  try {
    await requireRole(['Administrador']);
    
    const validatedData = ProductCategorySchema.parse(data);

    const newCategory = {
      ...validatedData,
      productCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('productCategories').add(newCategory);

    revalidatePath('/products/categories');
    return { success: true, message: 'Categoría creada con éxito.' };
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof ZodError) {
      return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    }
    if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'Ocurrió un error al crear la categoría.' };
  }
}

/**
 * Updates an existing product category. Only Administrators can perform this action.
 */
export async function updateCategoryAction(id: string, data: z.infer<typeof ProductCategorySchema>): Promise<ActionResponse> {
  try {
    await requireRole(['Administrador']);
    
    const validatedData = ProductCategorySchema.parse(data);
    const categoryRef = db.collection('productCategories').doc(id);

    if (!(await categoryRef.get()).exists) {
        return { success: false, message: 'La categoría no existe.' };
    }

    await categoryRef.update({
        ...validatedData,
        updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/products/categories');
    return { success: true, message: 'Categoría actualizada con éxito.' };
  } catch (error) {
    console.error("Error updating category:", error);
    if (error instanceof ZodError) {
      return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    }
    if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'Ocurrió un error al actualizar la categoría.' };
  }
}

/**
 * Deletes a product category. Only Administrators can perform this action.
 * It will fail if there are products associated with this category.
 */
export async function deleteCategoryAction(id: string): Promise<ActionResponse> {
  try {
    await requireRole(['Administrador']);
    
    const categoryRef = db.collection('productCategories').doc(id);
    const productsQuery = db.collection('products').where('category', '==', id).limit(1);

    const [categoryDoc, productsSnapshot] = await Promise.all([
        categoryRef.get(),
        productsQuery.get()
    ]);

    if (!categoryDoc.exists) {
      return { success: false, message: 'La categoría no existe.' };
    }

    if (!productsSnapshot.empty) {
      return { success: false, message: 'No se puede eliminar. Existen productos asociados a esta categoría.' };
    }

    await categoryRef.delete();

    revalidatePath('/products/categories');
    return { success: true, message: 'Categoría eliminada con éxito.' };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    if (error instanceof Error && error.name === 'UnauthorizedError') {
        return { success: false, message: error.message };
    }
    return { success: false, message: 'Ocurrió un error al eliminar la categoría.' };
  }
}
