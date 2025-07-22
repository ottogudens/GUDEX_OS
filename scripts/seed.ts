
import { db } from '../src/lib/firebase-admin'; // Using admin SDK for privileged writes
import { auth } from '../src/lib/firebase-admin';
import 'dotenv/config';

async function seedDatabase() {
  console.log('Starting database seed...');

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('Error: NEXT_PUBLIC_ADMIN_EMAIL is not defined in .env file.');
    console.log('Please add the admin email to your .env file to seed the database.');
    return;
  }

  try {
    // 1. Check if the admin user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
      console.log(`Admin user ${adminEmail} already exists in Firebase Auth with UID: ${userRecord.uid}.`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Admin user ${adminEmail} not found in Firebase Auth. This script requires the user to exist.`);
        console.log(`Please create the user via the Firebase Console or your application's registration page.`);
        return;
      }
      throw error; // Rethrow other errors
    }

    const adminUid = userRecord.uid;

    // 2. Check if the user document exists in Firestore and has the 'Administrador' role
    const userDocRef = db.collection('users').doc(adminUid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists && userDoc.data()?.role === 'Administrador') {
      console.log(`Admin user document already exists in Firestore with the correct role.`);
    } else {
      console.log(`User document for ${adminEmail} does not exist or has an incorrect role. Creating/updating document...`);
      await userDocRef.set({
        name: 'Admin', // You can change this to a more specific name
        email: adminEmail,
        role: 'Administrador',
      }, { merge: true }); // Use merge to avoid overwriting other fields if the doc exists
      console.log(`Successfully set admin role for ${adminEmail} in Firestore.`);
    }

    console.log('Database seed completed successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
