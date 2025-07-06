'use server';
/**
 * @fileOverview An AI assistant that answers questions about a user's vehicles.
 * 
 * - askVehicleAssistant - A function that handles the chat interaction.
 * - VehicleAssistantInput - The input type for the function.
 * - VehicleAssistantOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VehicleInfoSchema = z.object({
    make: z.string(),
    model: z.string(),
    year: z.number(),
    licensePlate: z.string(),
    vin: z.string().optional(),
    fuelType: z.string(),
    engineDisplacement: z.string(),
});

export const VehicleAssistantInputSchema = z.object({
  question: z.string().describe("The user's question about their vehicles."),
  vehicles: z.array(VehicleInfoSchema).describe("A list of the user's registered vehicles."),
});
export type VehicleAssistantInput = z.infer<typeof VehicleAssistantInputSchema>;

export const VehicleAssistantOutputSchema = z.object({
  answer: z.string().describe("The AI assistant's answer."),
});
export type VehicleAssistantOutput = z.infer<typeof VehicleAssistantOutputSchema>;

export async function askVehicleAssistant(input: VehicleAssistantInput): Promise<VehicleAssistantOutput> {
  return vehicleAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'vehicleAssistantPrompt',
  input: { schema: VehicleAssistantInputSchema },
  output: { schema: VehicleAssistantOutputSchema },
  prompt: `You are a helpful AI assistant for a car workshop customer portal.
Your ONLY task is to answer questions based on the vehicle information provided below.
You must be friendly and concise.
If the user asks about anything other than the provided vehicle information (e.g., general knowledge, other topics, scheduling, pricing), you MUST politely decline and state that you can only help with information about their registered vehicles.

Here is the user's vehicle information:
{{#if vehicles}}
  {{#each vehicles}}
  - Vehicle: {{this.year}} {{this.make}} {{this.model}}
    - License Plate: {{this.licensePlate}}
    - VIN: {{this.vin}}
    - Fuel Type: {{this.fuelType}}
    - Engine: {{this.engineDisplacement}}
  {{/each}}
{{else}}
  The user has no vehicles registered.
{{/if}}

User's question: "{{question}}"

Based *only* on the information above, provide your best answer.`,
});

const vehicleAssistantFlow = ai.defineFlow(
  {
    name: 'vehicleAssistantFlow',
    inputSchema: VehicleAssistantInputSchema,
    outputSchema: VehicleAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
