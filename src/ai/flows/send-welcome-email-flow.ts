'use server';
import 'dotenv/config';
/**
 * @fileOverview An AI flow to send a welcome email to a new customer.
 *
 * - sendWelcomeEmail - A function that handles sending the email.
 * - SendWelcomeEmailInput - The input type for the sendWelcomeEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchEmailSettings, fetchWorkshopSettings } from '@/lib/server-data';
import { logSentEmail, logEmailAction } from '@/lib/server-mutations';
import nodemailer from 'nodemailer';

const SendWelcomeEmailInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  password: z.string().describe('The default password for the customer.'),
  loginUrl: z.string().url().describe('The URL to the login page.'),
});
export type SendWelcomeEmailInput = z.infer<typeof SendWelcomeEmailInputSchema>;

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<{ success: boolean }> {
  return sendWelcomeEmailFlow(input);
}

const emailPrompt = ai.definePrompt({
  name: 'welcomeEmailPrompt',
  input: { schema: SendWelcomeEmailInputSchema },
  prompt: `
    Generate a friendly and professional welcome email for a new car workshop customer.

    Subject: Welcome to GUDEX-OS! Your Account Details

    Body:
    Hello {{customerName}},

    Welcome to our workshop! An account has been created for you in our system. You can use our client portal to view your vehicle's service history, schedule appointments, and more.

    Here are your login details:
    Email: {{customerEmail}}
    Password: {{password}}

    You can log in here:
    {{loginUrl}}

    We recommend changing your password after your first login.

    We look forward to serving you!

    Sincerely,
    The GUDEX-OS Team
  `,
});

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: SendWelcomeEmailInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const flowName = 'sendWelcomeEmailFlow';
    await logEmailAction('INFO', `Starting welcome email dispatch to ${input.customerEmail}`, flowName);

    // 1. Fetch settings and credentials
    const [emailSettings, workshopSettings] = await Promise.all([
        fetchEmailSettings(),
        fetchWorkshopSettings()
    ]);
    const smtpUser = process.env.SMTP_USER || emailSettings.user;
    const smtpPass = process.env.SMTP_PASS || emailSettings.pass;

    if (!emailSettings.host || !smtpUser || !smtpPass || !emailSettings.from) {
        await logEmailAction('ERROR', 'Email settings are not fully configured (check DB and .env). Cannot send welcome email.', flowName);
        return { success: false };
    }

    // 2. Generate email content
    const response = await emailPrompt(input);
    if (!response.text) {
      await logEmailAction('ERROR', 'Could not generate welcome email body.', flowName);
      return { success: false };
    }

    const emailContent = response.text;
    const subjectMatch = emailContent.match(/Subject: (.*)/);
    const bodyMatch = emailContent.match(/Body:\n([\s\S]*)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Welcome to GUDEX-OS! Your Account Details';
    
    if (!subjectMatch || !bodyMatch) {
      await logEmailAction('ERROR', 'Could not parse welcome email subject or body.', flowName);
      return { success: false };
    }

    // 3. Send email
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
        });
        
        await logSentEmail({ to: input.customerEmail, subject, status: 'Enviado', flow: flowName });
        await logEmailAction('INFO', `Welcome email to ${input.customerEmail} sent successfully.`, flowName);
        return { success: true };

    } catch (error) {
        await logSentEmail({ to: input.customerEmail, subject, status: 'Fallido', flow: flowName });
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        await logEmailAction('ERROR', `Failed to send welcome email: ${errorMessage}`, flowName);
        return { success: false };
    }
  }
);
