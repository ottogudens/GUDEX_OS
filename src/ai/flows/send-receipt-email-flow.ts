'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI flow to send a receipt email to a customer.
 *
 * - sendReceiptEmail - A function that handles sending the email.
 * - SendReceiptEmailInput - The input type for the sendReceiptEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchEmailSettings, fetchWorkshopSettings } from '@/lib/server-data';
import { logSentEmail, logEmailAction } from '@/lib/server-mutations';
import nodemailer from 'nodemailer';

const SendReceiptEmailInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  saleId: z.string().describe('The unique ID of the sale.'),
  receiptPdfAsBase64: z.string().describe('The receipt PDF file encoded in Base64.'),
});
export type SendReceiptEmailInput = z.infer<typeof SendReceiptEmailInputSchema>;

export async function sendReceiptEmail(input: SendReceiptEmailInput): Promise<{ success: boolean }> {
  return sendReceiptEmailFlow(input);
}

const emailPrompt = ai.definePrompt({
  name: 'receiptEmailPrompt',
  input: { schema: z.object({ customerName: z.string(), saleId: z.string() }) },
  prompt: `
    Generate a friendly and professional email for a car workshop customer.

    Subject: Your GUDEX-OS Purchase Receipt - Sale #{{saleId}}

    Body:
    Hello {{customerName}},

    Thank you for your purchase. We are attaching your sales receipt.

    We appreciate your business and hope to see you soon.

    Sincerely,
    The GUDEX-OS Team
  `,
});

const sendReceiptEmailFlow = ai.defineFlow(
  {
    name: 'sendReceiptEmailFlow',
    inputSchema: SendReceiptEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const flowName = 'sendReceiptEmailFlow';
    await logEmailAction('INFO', `Starting email dispatch for sale ${input.saleId} to ${input.customerEmail}`, flowName);

    // 1. Fetch settings and credentials
    const [emailSettings, workshopSettings] = await Promise.all([
        fetchEmailSettings(),
        fetchWorkshopSettings()
    ]);
    const smtpUser = process.env.SMTP_USER || emailSettings.user;
    const smtpPass = process.env.SMTP_PASS || emailSettings.pass;

    if (!emailSettings.host || !smtpUser || !smtpPass || !emailSettings.from) {
        await logEmailAction('ERROR', 'Email settings are not fully configured (check DB and .env). Cannot send email.', flowName);
        return { success: false };
    }

    // 2. Generate email content
    const response = await emailPrompt({
      customerName: input.customerName,
      saleId: input.saleId.slice(-6).toUpperCase(),
    });

    if (!response.text) {
      await logEmailAction('ERROR', 'Could not generate email body.', flowName);
      return { success: false };
    }

    const emailContent = response.text;
    const subjectMatch = emailContent.match(/Subject: (.*)/);
    const bodyMatch = emailContent.match(/Body:\n([\s\S]*)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Your GUDEX-OS Purchase Receipt - Sale #${input.saleId.slice(-6).toUpperCase()}`;

    if (!subjectMatch || !bodyMatch) {
      await logEmailAction('ERROR', 'Could not parse email subject or body.', flowName);
      return { success: false };
    }
    
    // 3. Send email using nodemailer
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
            from: `"${workshopSettings.name}" <${emailSettings.from}>`,
            to: input.customerEmail,
            subject: subject,
            text: bodyMatch[1].trim(),
            attachments: [
                {
                    filename: `receipt-${input.saleId.slice(-6).toUpperCase()}.pdf`,
                    content: input.receiptPdfAsBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                },
            ],
        });
        
        await logSentEmail({ to: input.customerEmail, subject, status: 'Enviado', flow: flowName });
        await logEmailAction('INFO', `Email for sale ${input.saleId} sent successfully to ${input.customerEmail}.`, flowName);
        return { success: true };

    } catch (error) {
        await logSentEmail({ to: input.customerEmail, subject, status: 'Fallido', flow: flowName });
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        await logEmailAction('ERROR', `Failed to send email: ${errorMessage}`, flowName);
        return { success: false };
    }
  }
);
