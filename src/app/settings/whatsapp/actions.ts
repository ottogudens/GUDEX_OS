
"use server";

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { requireRole } from '@/lib/server-auth';
import { WhatsAppFlowSchema } from '@/lib/schemas';

// La URL base del bot de WhatsApp. Debería estar en una variable de entorno.
const BOT_API_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3008';

// --- COMENTARIO DE SEGURIDAD ---
// La API del Bot debería estar protegida por una clave secreta para prevenir
// el acceso no autorizado. Esta clave debería ser una variable de entorno.
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY;

// Headers que se enviarán con cada petición a la API del bot.
const getApiHeaders = () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (BOT_API_KEY) {
        headers['Authorization'] = `Bearer ${BOT_API_KEY}`;
    }
    return headers;
};

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: any;
};

type FlowData = z.infer<typeof WhatsAppFlowSchema>;

export async function getFlowsAction(): Promise<any[]> {
    await requireRole(['Administrador']);
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows`, { 
            cache: 'no-store',
            headers: getApiHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch flows from bot API');
        return await response.json();
    } catch (error) {
        console.error('getFlowsAction Error:', error);
        return [];
    }
}

export async function createFlowAction(flowData: FlowData): Promise<ActionResponse> {
    await requireRole(['Administrador']);
    try {
        const validatedData = WhatsAppFlowSchema.parse(flowData);
        const response = await fetch(`${BOT_API_URL}/v1/flows`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(validatedData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'Failed to create flow.' };
        }
        await reloadBotAction();
        revalidatePath('/settings/whatsapp');
        return { success: true, message: 'Flujo creado con éxito.' };
    } catch (error: any) {
        if (error instanceof ZodError) {
          return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        }
        return { success: false, message: error.message };
    }
}

export async function updateFlowAction(flowId: string, flowData: FlowData): Promise<ActionResponse> {
    await requireRole(['Administrador']);
    try {
        const validatedData = WhatsAppFlowSchema.parse(flowData);
        const response = await fetch(`${BOT_API_URL}/v1/flows/${flowId}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify(validatedData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'Failed to update flow.' };
        }
        await reloadBotAction();
        revalidatePath('/settings/whatsapp');
        return { success: true, message: 'Flujo actualizado con éxito.' };
    } catch (error: any)
     {
        if (error instanceof ZodError) {
          return { success: false, message: 'Error de validación.', errors: error.flatten().fieldErrors };
        }
        return { success: false, message: error.message };
    }
}

export async function deleteFlowAction(flowId: string): Promise<ActionResponse> {
    await requireRole(['Administrador']);
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows/${flowId}`, {
            method: 'DELETE',
            headers: getApiHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'Failed to delete flow.' };
        }
        await reloadBotAction();
        revalidatePath('/settings/whatsapp');
        return { success: true, message: 'Flujo eliminado con éxito.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

async function reloadBotAction() {
    // Esta acción interna también debe estar protegida.
    await requireRole(['Administrador']);
    try {
        await fetch(`${BOT_API_URL}/v1/bot/reload`, {
            method: 'POST',
            headers: getApiHeaders(),
        });
    } catch (error) {
        console.error('Failed to reload bot, it might need a manual restart.', error);
    }
}
