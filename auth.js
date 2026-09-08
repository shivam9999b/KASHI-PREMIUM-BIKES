// js/auth.js
import { auth } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ===== SIGNUP =====
export async function signUp(email, password, name) {
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);
        alert('✅ रजिस्टर हो गया! अपने ईमेल को वेरिफाई करें।');
        window.location.href = 'login.html';
        return userCred.user;
    } catch (error) {
        alert('❌ ' + error.message);
        throw error;
    }
}

// ===== LOGIN =====
export async function logIn(email, password) {
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        alert('✅ लॉगिन सफल!');
        window.location.href = 'index.html';
        return userCred.user;
    } catch (error) {
        alert('❌ ' + error.message);
        throw error;
    }
}

// ===== LOGOUT =====
export async function logOut() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

// ===== CHECK AUTH STATE =====
export function checkAuth(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}