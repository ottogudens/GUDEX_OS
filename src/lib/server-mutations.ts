import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { SentEmail, EmailLog } from './types';

// This file contains mutation functions intended for server-side use.
// It is NOT marked with 'use client'.

export async function logSentEmail(data: Omit<SentEmail, 'id' | 'sentAt'>) {
    const emailsCol = collection(db, 'sentEmails');
    await addDoc(emailsCol, {
        ...data,
        sentAt: serverTimestamp(),
    });
}

export async function logEmailAction(level: 'INFO' | 'ERROR', message: string, flow: string) {
    const logsCol = collection(db, 'emailLogs');
    await addDoc(logsCol, {
        level,
        message,
        flow,
        createdAt: serverTimestamp(),
    });
}
