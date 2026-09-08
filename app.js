// js/app.js
import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAllVehicles, getVehicle } from './firestore.js';
import { uploadImage } from './storage.js';

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initNavbar();
    initHeroStats();
    initLatestListings();
    initCategoryFilters();
});

// ===== NAVBAR =====
function initNavbar() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Auth state
    onAuthStateChanged(auth, (user) => {
        const authNav = document.getElementById('authNav');
        if (!authNav) return;

        if (user) {
            authNav.innerHTML = `
                <div class="user-dropdown">
                    <span class="user-email">${user.email}</span>
                    <a href="#" id="logoutBtn" class="btn-logout">
                        <i class="fas fa-sign-out-alt"></i> लॉगआउट
                    </a>
                </div>
            `;
            document.getElementById('logoutBtn')?.addEventListener('click', () => {
                auth.signOut();
                window.location.href = 'index.html';
            });
        } else {
            authNav.innerHTML = `
                <a href="login.html" class="btn-nav">
                    <i class="fas fa-sign-in-alt"></i> लॉगिन
                </a>
            `;
        }
    });
}

// ===== HERO STATS =====
async function initHeroStats() {
    const bikeCount = document.getElementById('bikeCount');
    const carCount = document.getElementById('carCount');
    const userCount = document.getElementById('userCount');

    if (!bikeCount) return;

    try {
        const vehicles = await getAllVehicles();
        const bikes = vehicles.filter(v => v.type === 'bike');
        const cars = vehicles.filter(v => v.type === 'car');
        
        bikeCount.textContent = bikes.length;
        carCount.textContent = cars.length;
        userCount.textContent = Math.floor(Math.random() * 50) + 100;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===== LATEST LISTINGS =====
async function initLatestListings() {
    const grid = document.getElementById('listingGrid');
    if (!grid) return;

    try {
        const vehicles = await getAllVehicles();
        const latest = vehicles.slice(0, 6);

        if (latest.length === 0) {
            grid.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-car" style="font-size:3rem;color:#ddd;"></i>
                    <p>अभी कोई गाड़ी नहीं डाली गई</p>
                    <a href="post-vehicle.html" class="btn-primary">पहली गाड़ी डालें</a>
                </div>
            `;
            return;
        }

        grid.innerHTML = latest.map(v => `
            <div class="listing-card">
                <img src="${v.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                     alt="${v.title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" />
                <div class="card-body">
                    <span class="badge ${v.type}">${v.type === 'bike' ? '🏍️ बाइक' : '🚗 कार'}</span>
                    <h3>${v.title || 'No Title'}</h3>
                    <p class="price">₹${(v.price || 0).toLocaleString()}</p>
                    <p class="location"><i class="fas fa-map-pin"></i> ${v.city || 'वाराणसी'}</p>
                    <a href="vehicle-detail.html?id=${v.id}" class="btn-view">देखें</a>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading listings:', error);
        grid.innerHTML = `<p style="color:#e74c3c;">❌ लिस्टिंग लोड नहीं हुई</p>`;
    }
}

// ===== CATEGORY FILTERS =====
function initCategoryFilters() {
    window.filterCategory = (type) => {
        window.location.href = `listings.html?filter=${type}`;
    };
}

// ===== GLOBAL FUNCTIONS =====
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    if (!input) return;
    const icon = event?.currentTarget?.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
};

// ===== EXPORT =====
export { initNavbar, initHeroStats, initLatestListings };