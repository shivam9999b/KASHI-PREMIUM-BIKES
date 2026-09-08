// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ===== YOUR FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyA3eUS3fK8EoCybJHhUnBEmZKWAAENp8O0",
    authDomain: "bike-sell-website.firebaseapp.com",
    databaseURL: "https://bike-sell-website-default-rtdb.firebaseio.com",
    projectId: "bike-sell-website",
    storageBucket: "bike-sell-website.firebasestorage.app",
    messagingSenderId: "440643017346",
    appId: "1:440643017346:web:ffb1c21ebcdac4f5e7329b"
};

// ===== INITIALIZE FIREBASE =====
const app = initializeApp(firebaseConfig);

// ===== EXPORT SERVICES =====
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app); // Realtime Database (अगर use करें)

console.log("✅ Firebase Connected Successfully!");