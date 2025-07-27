
'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { db } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/server-auth';
import { ProductSchema } from '@/lib/schemas';
import type { Product, ProductCategory } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
};

/**
 * Fetches products from Firestore. Can be filtered by category.
 * Requires staff-level access.
 */
export async function fetchProductsAction(options?: { categoryId?: string }): Promise<Product[]> {
  await requireRole(['Administrador', 'Mecanico', 'Cajero']);
  
  let productsQuery = db.collection('products').orderBy('name');

  // Si se proporciona una categoría, filtramos en el servidor.
  if (options?.categoryId) {
    // Nota: Esto asume que el ID de la categoría está guardado en los productos.
    // Si solo se guarda el nombre, esta consulta deberá adaptarse.
    productsQuery = productsQuery.where('categoryId', '==', options.categoryId);
  }
  
  const snapshot = await productsQuery.get();
  
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Product[];
}

/**
 * Fetches all product categories.
 * Requires staff-level access.
 */
export async function fetchProductCategoriesAction(): Promise<ProductCategory[]> {
    await requireRole(['Administrador', 'Mecanico', 'Cajero']);
    const snapshot = await db.collection('productCategories').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
}

/**
 * Creates a new product.
 * Only Administrators can perform this action.
 */
export async function createProductAction(data: z.infer<typeof ProductSchema>): Promise<ActionResponse> {
  await requireRole(['Administrador']);
  try {
    const validatedData = ProductSchema.parse(data);
    const newProduct = {
      ...validatedData,
      code: Math.random().toString(36).substr(2, 9).toUpperCase(), // Placeholder code
      createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('products').add(newProduct);
    revalidatePath('/products');
    return { success: true, message: 'Producto creado con éxito.' };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
    return { success: false, message: 'Ocurrió un error al crear el producto.' };
  }
}

/**
 * Updates an existing product.
 * Only Administrators can perform this action.
 */
export async function updateProductAction(id: string, data: z.infer<typeof ProductSchema>): Promise<ActionResponse> {
    await requireRole(['Administrador']);
    try {
        const validatedData = ProductSchema.parse(data);
        const productRef = db.collection('products').doc(id);
        if (!(await productRef.get()).exists) return { success: false, message: 'El producto no existe.' };
        
        await productRef.update({ ...validatedData, updatedAt: FieldValue.serverTimestamp() });
        revalidatePath('/products');
        return { success: true, message: 'Producto actualizado con éxito.' };
    } catch (error) {
        if (error instanceof ZodError) return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        return { success: false, message: 'Ocurrió un error al actualizar el producto.' };
    }
}

/**
 * Deletes a product.
 * Only Administrators can perform this action.
 */
export async function deleteProductAction(id: string): Promise<ActionResponse> {
  await requireRole(['Administrador']);
  try {
    const productRef = db.collection('products').doc(id);
    if (!(await productRef.get()).exists) return { success: false, message: 'El producto no existe.' };
    
    // Opcional: Verificar si el producto está en alguna orden de trabajo antes de borrar.
    
    await productRef.delete();
    revalidatePath('/products');
    return { success: true, message: 'Producto eliminado con éxito.' };
  } catch (error: any) {
    return { success: false, message: 'Ocurrió un error al eliminar el producto.' };
  }
}
