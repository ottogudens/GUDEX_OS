
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Service, User } from '@/lib/types';

// ====================================================================================
// --- DATA TO SEED ---
// ====================================================================================

const adminUser: Omit<User, 'id'> = {
    name: 'Administrador Principal',
    email: 'admin@gudex.cl',
    role: 'Administrador',
};
const ADMIN_UID = 'PZqjK23iMvN9oG7rEa2aD5YvC1r2'; // IMPORTANT: This UID must match the one created in Firebase Auth.

const productCategories = [
    { name: 'Filtros', visibleInPOS: true, subcategories: ['Filtro de Aceite', 'Filtro de Aire', 'Filtro de Combustible'] },
    { name: 'Lubricantes', visibleInPOS: true, subcategories: ['Aceite de Motor', 'Aceite de Caja', 'Grasas'] },
    { name: 'Frenos', visibleInPOS: true, subcategories: ['Pastillas', 'Discos', 'Líquido de Frenos'] },
];

const serviceCategories = [
    { name: 'Mantenimiento Preventivo', availableInPOS: true, subcategories: ['Cambio de Aceite y Filtro', 'Afinamiento Completo'] },
    { name: 'Reparaciones Mecánicas', availableInPOS: true, subcategories: ['Sistema de Frenos', 'Suspensión y Dirección'] },
    { name: 'Diagnóstico', availableInPOS: true, subcategories: [] },
];

const sampleProducts: Omit<Product, 'id' | 'code'>[] = [
    { name: 'Aceite Motor 10W-40', brand: 'Mobil', salePrice: 12000, stock: 50, category: 'Lubricantes', subcategory: 'Aceite de Motor', visibleInPOS: true },
    { name: 'Filtro de Aceite X-123', brand: 'Bosch', salePrice: 8000, stock: 30, category: 'Filtros', subcategory: 'Filtro de Aceite', visibleInPOS: true },
    { name: 'Pastillas de Freno Delanteras', brand: 'Brembo', salePrice: 25000, stock: 20, category: 'Frenos', subcategory: 'Pastillas', visibleInPOS: true },
];

const sampleServices: Omit<Service, 'id' | 'code'>[] = [
    { name: 'Cambio de Aceite y Filtro', price: 35000, category: 'Mantenimiento Preventivo', subcategory: 'Cambio de Aceite y Filtro', availableInPOS: true },
    { name: 'Revisión y Diagnóstico General', price: 20000, category: 'Diagnóstico', availableInPOS: true },
];

// ====================================================================================
// --- SEEDING FUNCTIONS ---
// ====================================================================================

async function seedSettings() {
    console.log('Seeding settings...');
    const batch = writeBatch(db);

    const countersRef = doc(db, 'settings', 'counters');
    batch.set(countersRef, {
        productCounter: sampleProducts.length,
        serviceCounter: sampleServices.length,
        workOrderCounter: 0,
    }, { merge: true });

    const profileRef = doc(db, 'settings', 'profile');
    batch.set(profileRef, {
        name: 'Tu Taller GUDEX',
        rut: '77.777.777-7',
        address: 'Av. Siempre Viva 123, Springfield',
        phone: '+56912345678',
        logoUrl: 'https://placehold.co/200x66.png',
    }, { merge: true });

    await batch.commit();
    console.log('Settings seeded successfully.');
}

async function seedUsers() {
    console.log('Seeding admin user...');
    // IMPORTANT: Make sure to create this user in Firebase Authentication manually
    // with the same email and get its UID.
    const userRef = doc(db, 'users', ADMIN_UID);
    await setDoc(userRef, adminUser);
    console.log('Admin user seeded successfully.');
}

async function seedCategories() {
    console.log('Seeding categories...');
    const batch = writeBatch(db);

    // Product Categories
    for (const cat of productCategories) {
        const parentRef = doc(collection(db, 'productCategories'));
        batch.set(parentRef, { name: cat.name, visibleInPOS: cat.visibleInPOS });
        for (const sub of cat.subcategories) {
            const subRef = doc(collection(db, 'productCategories'));
            batch.set(subRef, { name: sub, parentId: parentRef.id });
        }
    }

    // Service Categories
    for (const cat of serviceCategories) {
        const parentRef = doc(collection(db, 'serviceCategories'));
        batch.set(parentRef, { name: cat.name, availableInPOS: cat.availableInPOS });
        for (const sub of cat.subcategories) {
            const subRef = doc(collection(db, 'serviceCategories'));
            batch.set(subRef, { name: sub, parentId: parentRef.id });
        }
    }

    await batch.commit();
    console.log('Categories seeded successfully.');
}

async function seedItems() {
    console.log('Seeding products and services...');
    const batch = writeBatch(db);

    // Products
    sampleProducts.forEach((product, index) => {
        const productRef = doc(collection(db, 'products'));
        const code = `PROD-${String(index + 1).padStart(6, '0')}`;
        batch.set(productRef, { ...product, code });
    });

    // Services
    sampleServices.forEach((service, index) => {
        const serviceRef = doc(collection(db, 'services'));
        const code = `SVC-${String(index + 1).padStart(6, '0')}`;
        batch.set(serviceRef, { ...service, code });
    });

    await batch.commit();
    console.log('Products and services seeded successfully.');
}

async function main() {
    console.log('Starting Firestore data seeding...');
    try {
        await seedSettings();
        await seedUsers();
        await seedCategories();
        await seedItems();
        console.log('✅ Seeding completed successfully!');
        console.log('\nIMPORTANT: Remember to create the admin user in Firebase Authentication with the UID specified in the script.');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    }
}

main();
