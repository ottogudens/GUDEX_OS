
"use server";

import { revalidatePath } from 'next/cache';

// La URL base del bot de WhatsApp. Debería estar en una variable de entorno.
const BOT_API_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3008';

type FlowPayload = {
  name: string;
  keywords: string[];
  responses: { type: 'text'; content: string; media?: string | null }[];
  isEnabled: boolean;
};


export async function getFlowsAction() {
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Failed to fetch flows from bot API');
        }
        return await response.json();
    } catch (error) {
        console.error('getFlowsAction Error:', error);
        return [];
    }
}

export async function createFlowAction(flowData: FlowPayload) {
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flowData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'Failed to create flow.' };
        }
        await reloadBotAction();
        revalidatePath('/settings/whatsapp');
        return { success: true, message: 'Flujo creado con éxito.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateFlowAction(flowId: string, flowData: FlowPayload) {
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows/${flowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flowData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'Failed to update flow.' };
        }
        await reloadBotAction();
        revalidatePath('/settings/whatsapp');
        return { success: true, message: 'Flujo actualizado con éxito.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteFlowAction(flowId: string) {
    try {
        const response = await fetch(`${BOT_API_URL}/v1/flows/${flowId}`, {
            method: 'DELETE',
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
    try {
        await fetch(`${BOT_API_URL}/v1/bot/reload`, { method: 'POST' });
    } catch (error) {
        console.error('Failed to reload bot, it might need a manual restart.', error);
    }
}
