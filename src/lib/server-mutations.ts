
'use server';

import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface UserInfo {
    id: string;
    name: string;
}

interface FinalAmounts {
    cash: number;
    card: number;
    transfer: number;
}

interface CloseCashRegisterParams {
    sessionId: string;
    finalAmounts: FinalAmounts;
    closedBy: UserInfo;
    summary: {
        totalSales: number;
        cashSales: number;
        cardSales: number;
        transferSales: number;
        manualIncome: number;
        manualExpense: number;
        expectedInCash: number;
    };
}

export async function closeCashRegister(params: CloseCashRegisterParams) {
    const { sessionId, finalAmounts, closedBy, summary } = params;

    if (!sessionId) {
        throw new Error("Session ID is required.");
    }

    const sessionRef = doc(db, 'cashRegisterSessions', sessionId);

    try {
        await updateDoc(sessionRef, {
            status: 'closed',
            closedAt: serverTimestamp(),
            closedBy: closedBy,
            closingAmount: finalAmounts,
            expectedAmount: {
                cash: summary.expectedInCash,
                card: summary.cardSales,
                transfer: summary.transferSales,
            },
            summary: {
                totalSales: summary.totalSales,
                cashSales: summary.cashSales,
                cardSales: summary.cardSales,
                transferSales: summary.transferSales,
                manualIncome: summary.manualIncome,
                manualExpense: summary.manualExpense,
            },
            discrepancy: {
                cash: finalAmounts.cash - summary.expectedInCash,
                card: finalAmounts.card - summary.cardSales,
                transfer: finalAmounts.transfer - summary.transferSales,
            },
        });
    } catch (error) {
        console.error("Error updating cash register session document:", error);
        throw new Error(`Failed to update Firestore document: ${error.message}`);
    }
}
