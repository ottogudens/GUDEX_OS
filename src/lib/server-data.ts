import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './firebase';
import type { WorkshopSettings, EmailSettings, DVI } from './types';

// This file contains data-fetching functions intended for server-side use.
// It is NOT marked with 'use client'.

export async function fetchWorkshopSettings(): Promise<WorkshopSettings> {
  noStore();
  const defaultSettings: WorkshopSettings = {
    name: 'GUDEX-OS',
    rut: '',
    address: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    logoUrl: 'https://placehold.co/200x66.png',
  };

  try {
    const settingsDocRef = doc(db, 'settings', 'profile');
    const settingsDoc = await getDoc(settingsDocRef);

    if (!settingsDoc.exists()) {
      console.warn("Workshop settings not found, returning default settings.");
      return defaultSettings;
    }
    
    return { id: 'profile', ...settingsDoc.data() } as WorkshopSettings;

  } catch (error) {
    console.error("Error fetching workshop settings:", error);
    return defaultSettings;
  }
}

export async function fetchEmailSettings(): Promise<EmailSettings> {
  noStore();
  const defaultSettings: EmailSettings = {
    host: '', port: 465, user: '', pass: '', from: '', secure: true
  };

  try {
    const settingsDocRef = doc(db, 'settings', 'email');
    const settingsDoc = await getDoc(settingsDocRef);

    if (!settingsDoc.exists()) {
      console.warn("Email settings not found, returning default settings.");
      return defaultSettings;
    }
    
    const data = settingsDoc.data();
    return { ...defaultSettings, ...data, id: 'email' } as EmailSettings;

  } catch (error) {
    console.error("Error fetching email settings:", error);
    return defaultSettings;
  }
}

export async function fetchInspections(): Promise<DVI[]> {
    noStore();
    try {
        const inspectionsRef = collection(db, 'dvi');
        const q = query(inspectionsRef, orderBy('createdAt', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        const inspections: DVI[] = [];
        querySnapshot.forEach((doc) => {
            inspections.push({ id: doc.id, ...doc.data() } as DVI);
        });
        
        return inspections;
    } catch (error) {
        console.error("Error fetching DVI inspections:", error);
        throw new Error('Failed to fetch inspections.');
    }
}
