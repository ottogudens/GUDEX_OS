'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI flow to notify the workshop about a new appointment request.
 *
 * - sendAppointmentRequestEmail - A function that handles sending the notification email.
 * - SendAppointmentRequestEmailInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchEmailSettings, fetchWorkshopSettings } from '@/lib/server-data';
import { logEmailAction, logSentEmail } from '@/lib/server-mutations';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SendAppointmentRequestEmailInputSchema = z.object({
    customerName: z.string().describe("The customer's name."),
    customerEmail: z.string().email().describe("The customer's email for contact."),
    vehicleDescription: z.string().describe("Description of the vehicle (e.g., 'Toyota Yaris 2020 (ABCD-12)')."),
    service: z.string().describe("The service requested by the customer."),
    notes: z.string().optional().describe("Additional notes from the customer."),
    requestedDate: z.string().datetime().describe("The requested date and time for the appointment in ISO 8601 format."),
});
type SendAppointmentRequestEmailInput = z.infer<typeof SendAppointmentRequestEmailInputSchema>;


export async function sendAppointmentRequestEmail(input: SendAppointmentRequestEmailInput): Promise<{ success: boolean }> {
  return sendAppointmentRequestEmailFlow(input);
}

const emailPrompt = ai.definePrompt({
    name: 'appointmentRequestEmailPrompt',
    input: { schema: z.object({ 
        workshopName: z.string(),
        customerName: z.string(), 
        customerEmail: z.string(),
        vehicleDescription: z.string(), 
        service: z.string(), 
        notes: z.string().optional(),
        formattedDate: z.string() 
    }) },
    prompt: `
        Generate an internal notification email for a car workshop about a new appointment request from the client portal.

        Subject: Nueva Solicitud de Cita: {{customerName}} para {{service}}

        Body:
        Hola equipo de {{workshopName}},

        Se ha recibido una nueva solicitud de cita a través del portal de clientes.

        Detalles de la Solicitud:
        - Cliente: {{customerName}}
        - Email Cliente: {{customerEmail}}
        - Vehículo: {{vehicleDescription}}
        - Servicio Solicitado: {{service}}
        - Fecha y Hora Sugerida: {{formattedDate}}
        {{#if notes}}
        - Comentarios del Cliente: {{notes}}
        {{/if}}

        Por favor, contactar al cliente a la brevedad para confirmar la cita y la disponibilidad horaria.

        Atentamente,
        El Sistema GUDEX-OS
    `,
});

const sendAppointmentRequestEmailFlow = ai.defineFlow(
  {
    name: 'sendAppointmentRequestEmailFlow',
    inputSchema: SendAppointmentRequestEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const flowName = 'sendAppointmentRequestEmailFlow';
    await logEmailAction('INFO', `Starting appointment request notification for ${input.customerName}`, flowName);

    const [emailSettings, workshopSettings] = await Promise.all([
        fetchEmailSettings(),
        fetchWorkshopSettings()
    ]);
    const smtpUser = process.env.SMTP_USER || emailSettings.user;
    const smtpPass = process.env.SMTP_PASS || emailSettings.pass;

    // The notification is sent to the workshop's own email address
    const workshopEmail = emailSettings.from;

    if (!emailSettings.host || !smtpUser || !smtpPass || !workshopEmail) {
        await logEmailAction('ERROR', 'Email settings are not fully configured. Cannot send appointment notification.', flowName);
        return { success: false };
    }

    const formattedDate = format(new Date(input.requestedDate), "eeee dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });

    const response = await emailPrompt({
        workshopName: workshopSettings.name,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        vehicleDescription: input.vehicleDescription,
        service: input.service,
        notes: input.notes,
        formattedDate: formattedDate,
    });

    if (!response.text) {
        await logEmailAction('ERROR', 'Could not generate appointment notification body.', flowName);
        return { success: false };
    }

    const emailContent = response.text;
    const subjectMatch = emailContent.match(/Subject: (.*)/);
    const bodyMatch = emailContent.match(/Body:\n([\s\S]*)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Nueva Solicitud de Cita de ${input.customerName}`;
    const body = bodyMatch ? bodyMatch[1].trim() : emailContent;

    try {
        const transporter = nodemailer.createTransport({
            host: emailSettings.host,
            port: emailSettings.port,
            secure: emailSettings.secure,
            auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
            from: `"${workshopSettings.name} (GUDEX-OS)" <${emailSettings.from}>`,
            to: workshopEmail, // Send to the workshop itself
            subject: subject,
            text: body,
        });
        
        await logSentEmail({ to: workshopEmail, subject, status: 'Enviado', flow: flowName });
        await logEmailAction('INFO', 'Appointment request email sent successfully to workshop.', flowName);
        return { success: true };

    } catch (error) {
        await logSentEmail({ to: workshopEmail, subject, status: 'Fallido', flow: flowName });
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        await logEmailAction('ERROR', `Failed to send appointment notification email: ${errorMessage}`, flowName);
        return { success: false };
    }
  }
);
