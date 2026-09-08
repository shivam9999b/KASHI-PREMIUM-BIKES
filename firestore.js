// js/firestore.js
import { db } from './firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const VEHICLES_COLLECTION = 'vehicles';

// ===== ADD VEHICLE =====
export async function addVehicle(data) {
    try {
        const docRef = await addDoc(collection(db, VEHICLES_COLLECTION), {
            ...data,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        alert('✅ गाड़ी सफलतापूर्वक डाल दी गई!');
        return docRef.id;
    } catch (error) {
        alert('❌ ' + error.message);
        throw error;
    }
}

// ===== GET ALL VEHICLES =====
export async function getAllVehicles(filter = null, sortBy = 'timestamp', sortOrder = 'desc') {
    try {
        let q = collection(db, VEHICLES_COLLECTION);
        
        // Filter
        if (filter && filter !== 'all') {
            q = query(q, where('type', '==', filter));
        }
        
        // Sort
        q = query(q, orderBy(sortBy, sortOrder));
        
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting vehicles:', error);
        return [];
    }
}

// ===== GET SINGLE VEHICLE =====
export async function getVehicle(id) {
    try {
        const snap = await getDoc(doc(db, VEHICLES_COLLECTION, id));
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting vehicle:', error);
        return null;
    }
}

// ===== UPDATE VEHICLE =====
export async function updateVehicle(id, data) {
    try {
        await updateDoc(doc(db, VEHICLES_COLLECTION, id), {
            ...data,
            updatedAt: new Date().toISOString()
        });
        alert('✅ गाड़ी अपडेट हो गई!');
        return true;
    } catch (error) {
        alert('❌ ' + error.message);
        throw error;
    }
}

// ===== DELETE VEHICLE =====
export async function deleteVehicle(id) {
    if (!confirm('क्या आप सच में यह गाड़ी डिलीट करना चाहते हैं?')) return;
    try {
        await deleteDoc(doc(db, VEHICLES_COLLECTION, id));
        alert('✅ गाड़ी डिलीट हो गई!');
        return true;
    } catch (error) {
        alert('❌ ' + error.message);
        throw error;
    }
}

// ===== GET VEHICLES BY USER =====
export async function getUserVehicles(userId) {
    try {
        const q = query(
            collection(db, VEHICLES_COLLECTION),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting user vehicles:', error);
        return [];
    }
}

// ===== SEARCH VEHICLES =====
export async function searchVehicles(searchTerm) {
    try {
        // Note: Firestore doesn't support full-text search natively
        // This is a simple client-side filter
        const all = await getAllVehicles();
        return all.filter(v => 
            v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    } catch (error) {
        console.error('Error searching:', error);
        return [];
    }
}