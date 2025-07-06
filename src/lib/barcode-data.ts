
'use server';

// This is a mock database for barcode lookups.
// In a real application, this would query an external API.

const barcodeDatabase: { [key: string]: { name: string; imageUrl: string; "data-ai-hint": string } } = {
  '7801234567890': {
    name: 'Bebida Gaseosa 3L',
    imageUrl: 'https://placehold.co/400x400.png',
    "data-ai-hint": "soda bottle"
  },
  '7809876543210': {
    name: 'Aceite de Motor 5W-30 Sintético',
    imageUrl: 'https://placehold.co/400x400.png',
    "data-ai-hint": "motor oil"
  },
  '1234567890123': {
    name: 'Filtro de Aire Premium',
    imageUrl: 'https://placehold.co/400x400.png',
    "data-ai-hint": "air filter"
  },
};

export async function lookupBarcode(barcode: string): Promise<{ name: string; imageUrl: string } | null> {
  if (barcodeDatabase[barcode]) {
    // In a real app you might not want to return the AI hint, but it's fine for this prototype
    return barcodeDatabase[barcode];
  }
  return null;
}
