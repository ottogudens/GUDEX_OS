'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI flow to send a test email.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchEmailSettings } from '@/lib/server-data';
import { logSentEmail, logEmailAction } from '@/lib/server-mutations';
import nodemailer from 'nodemailer';

const SendTestEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
});
export type SendTestEmailInput = z.infer<typeof SendTestEmailInputSchema>;

export async function sendTestEmail(input: SendTestEmailInput): Promise<{ success: boolean }> {
  return sendTestEmailFlow(input);
}

const sendTestEmailFlow = ai.defineFlow(
  {
    name: 'sendTestEmailFlow',
    inputSchema: SendTestEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const flowName = 'sendTestEmailFlow';
    const subject = 'Prueba de Correo - GUDEX-OS';
    const body = 'Este es un correo de prueba para verificar que la configuración de tu servidor SMTP es correcta.';
    
    await logEmailAction('INFO', `Starting test email dispatch to ${input.to}`, flowName);

    // 1. Fetch settings and credentials
    const emailSettings = await fetchEmailSettings();
    const smtpUser = process.env.SMTP_USER || emailSettings.user;
    const smtpPass = process.env.SMTP_PASS || emailSettings.pass;

    if (!emailSettings.host || !smtpUser || !smtpPass || !emailSettings.from) {
        await logEmailAction('ERROR', 'Email settings are not fully configured (check DB and .env). Cannot send email.', flowName);
        await logSentEmail({ to: input.to, subject, status: 'Fallido', flow: flowName });
        return { success: false };
    }
    
    // 2. Send email
    try {
        const transporter = nodemailer.createTransport({
            host: emailSettings.host,
            port: emailSettings.port,
            secure: emailSettings.secure,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.sendMail({
            from: `GUDEX-OS <${emailSettings.from}>`,
            to: input.to,
            subject: subject,
            text: body,
        });
        
        await logEmailAction('INFO', `Test email sent successfully to ${input.to}.`, flowName);
        await logSentEmail({ to: input.to, subject, status: 'Enviado', flow: flowName });
        return { success: true };

    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        await logEmailAction('ERROR', `Failed to send test email: ${errorMessage}`, flowName);
        await logSentEmail({ to: input.to, subject, status: 'Fallido', flow: flowName });
        return { success: false };
    }
  }
);
