
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createProductCategory, updateProductCategory, deleteProductCategory } from '@/lib/mutations';
import { ProductCategorySchema } from '@/lib/schemas';
import { log } from 'console';

export async function createCategoryAction(prevState: any, formData: FormData) {
  try {
    const dataToValidate = {
      name: formData.get('name'),
      visibleInPOS: formData.get('visibleInPOS') === 'on',
      parentId: formData.get('parentId') || null,
    };

    const validatedFields = ProductCategorySchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
      return {
        type: 'error',
        message: 'Error de validación. Por favor, revisa los campos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    await createProductCategory(validatedFields.data);
    
    revalidatePath('/products/categories');
    return { type: 'success', message: 'Categoría creada con éxito.' };

  } catch (error: any) {
    return { type: 'error', message: `Error al crear la categoría: ${error.message}` };
  }
}

export async function updateCategoryAction(prevState: any, formData: FormData) {
    try {
        const id = formData.get('id') as string;
        if (!id) {
            return { type: 'error', message: 'ID de categoría no proporcionado.' };
        }

        const dataToValidate = {
            name: formData.get('name'),
            visibleInPOS: formData.get('visibleInPOS') === 'on',
            parentId: formData.get('parentId') || null,
        };

        const validatedFields = ProductCategorySchema.safeParse(dataToValidate);

        if (!validatedFields.success) {
            return {
                type: 'error',
                message: 'Error de validación. Por favor, revisa los campos.',
                errors: validatedFields.error.flatten().fieldErrors,
            };
        }
        
        await updateProductCategory(id, validatedFields.data);
        
        revalidatePath('/products/categories');
        return { type: 'success', message: 'Categoría actualizada con éxito.' };

    } catch (error: any) {
        return { type: 'error', message: `Error al actualizar la categoría: ${error.message}` };
    }
}

export async function deleteCategoryAction(id: string) {
    try {
        if (!id) {
            throw new Error('ID de categoría no proporcionado.');
        }
        await deleteProductCategory(id);
        revalidatePath('/products/categories');
        return { type: 'success', message: 'Categoría eliminada con éxito.' };
    } catch (error: any) {
        return { type: 'error', message: `Error al eliminar la categoría: ${error.message}` };
    }
}
