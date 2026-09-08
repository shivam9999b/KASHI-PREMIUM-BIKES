// =============================================
// ADMIN PANEL - Complete JavaScript Logic
// =============================================

import { auth, db, storage } from '../../js/firebase.js';
import { 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// =============================================
// CONFIGURATION
// =============================================

const CONFIG = {
    // Admin Emails (जिन्हें Admin Access मिलेगा)
    adminEmails: [
        'admin@bike-sell.com',
        'your-email@gmail.com'
    ],
    // Per page items for pagination
    perPage: 10,
    // Collections
    collections: {
        vehicles: 'vehicles',
        users: 'users',
        reports: 'reports',
        settings: 'settings'
    }
};

// =============================================
// STATE MANAGEMENT
// =============================================

const state = {
    currentUser: null,
    isAdmin: false,
    vehicles: [],
    filteredVehicles: [],
    users: [],
    currentPage: 1,
    totalPages: 1,
    filterType: 'all',
    searchQuery: '',
    sortBy: 'latest',
    selectedVehicle: null,
    loading: false
};

// =============================================
// DOM REFS
// =============================================

const DOM = {
    // Navbar
    adminEmail: document.getElementById('adminEmail'),
    
    // Stats
    totalVehicles: document.getElementById('totalVehicles'),
    totalUsers: document.getElementById('totalUsers'),
    totalBikes: document.getElementById('totalBikes'),
    totalCars: document.getElementById('totalCars'),
    totalViews: document.getElementById('totalViews'),
    pendingListings: document.getElementById('pendingListings'),
    
    // Sidebar Badges
    vehicleBadge: document.getElementById('vehicleCount'),
    userBadge: document.getElementById('userCount'),
    pendingBadge: document.getElementById('pendingCount'),
    
    // Tables
    vehiclesList: document.getElementById('vehiclesList'),
    usersList: document.getElementById('usersList'),
    recentVehicles: document.getElementById('recentVehicles'),
    
    // Filters
    searchInput: document.getElementById('searchVehicle'),
    filterType: document.getElementById('filterType'),
    sortSelect: document.getElementById('sortSelect'),
    
    // Pagination
    pagination: document.getElementById('pagination'),
    pageInfo: document.getElementById('pageInfo'),
    
    // Modals
    editModal: document.getElementById('editModal'),
    viewModal: document.getElementById('viewModal'),
    addModal: document.getElementById('addModal'),
    deleteModal: document.getElementById('deleteModal'),
    
    // Forms
    editForm: document.getElementById('editForm'),
    addForm: document.getElementById('addForm'),
    
    // Loaders
    loadingSpinner: document.getElementById('loadingSpinner'),
    
    // Charts
    vehiclesChart: document.getElementById('vehiclesChart'),
    typeChart: document.getElementById('typeChart'),
    revenueChart: document.getElementById('revenueChart')
};

// =============================================
// AUTHENTICATION
// =============================================

/**
 * Check if user is authenticated and has admin rights
 */
export function initAdminAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Redirect to login
                window.location.href = '../login.html';
                reject('No user logged in');
                return;
            }

            state.currentUser = user;
            
            // Check if user is admin
            const isAdmin = CONFIG.adminEmails.includes(user.email);
            
            if (!isAdmin) {
                alert('❌ आपके पास Admin Access नहीं है!');
                window.location.href = '../index.html';
                reject('Not admin');
                return;
            }

            state.isAdmin = true;
            
            // Update UI with admin info
            if (DOM.adminEmail) {
                DOM.adminEmail.textContent = user.email;
            }
            
            resolve(user);
        });
    });
}

/**
 * Logout admin
 */
export function logoutAdmin() {
    if (confirm('क्या आप लॉगआउट करना चाहते हैं?')) {
        auth.signOut();
        window.location.href = '../index.html';
    }
}

// =============================================
// DASHBOARD
// =============================================

/**
 * Load all dashboard data
 */
export async function loadDashboard() {
    try {
        showLoading(true);
        
        // Load all vehicles
        const vehicles = await getAllVehicles();
        state.vehicles = vehicles;
        
        // Update stats
        updateStats(vehicles);
        
        // Load recent listings
        renderRecentVehicles(vehicles.slice(0, 5));
        
        // Initialize charts
        initCharts(vehicles);
        
        // Update sidebar badges
        updateSidebarBadges(vehicles);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Dashboard लोड नहीं हुआ: ' + error.message);
        showLoading(false);
    }
}

/**
 * Update stats cards
 */
function updateStats(vehicles) {
    const bikes = vehicles.filter(v => v.type === 'bike');
    const cars = vehicles.filter(v => v.type === 'car');
    
    if (DOM.totalVehicles) DOM.totalVehicles.textContent = vehicles.length;
    if (DOM.totalBikes) DOM.totalBikes.textContent = bikes.length;
    if (DOM.totalCars) DOM.totalCars.textContent = cars.length;
    if (DOM.totalUsers) DOM.totalUsers.textContent = getUniqueUsers(vehicles).length;
    if (DOM.totalViews) DOM.totalViews.textContent = getTotalViews(vehicles);
    if (DOM.pendingListings) DOM.pendingListings.textContent = getPendingListings(vehicles);
}

/**
 * Get unique users from vehicles
 */
function getUniqueUsers(vehicles) {
    const users = new Set();
    vehicles.forEach(v => {
        if (v.userId) users.add(v.userId);
    });
    return Array.from(users);
}

/**
 * Get total views (mock data)
 */
function getTotalViews(vehicles) {
    // This would be from analytics in production
    return Math.floor(Math.random() * 500) + 100;
}

/**
 * Get pending listings (mock data)
 */
function getPendingListings(vehicles) {
    // In production, check for 'status' field
    return Math.floor(Math.random() * 5);
}

/**
 * Update sidebar badges
 */
function updateSidebarBadges(vehicles) {
    if (DOM.vehicleBadge) DOM.vehicleBadge.textContent = vehicles.length;
    if (DOM.userBadge) DOM.userBadge.textContent = getUniqueUsers(vehicles).length;
    if (DOM.pendingBadge) DOM.pendingBadge.textContent = getPendingListings(vehicles);
}

// =============================================
// VEHICLES CRUD OPERATIONS
// =============================================

/**
 * Get all vehicles from Firestore
 */
export async function getAllVehicles(filter = null, sort = 'latest') {
    try {
        let q = collection(db, CONFIG.collections.vehicles);
        
        // Apply filter
        if (filter && filter !== 'all') {
            q = query(q, where('type', '==', filter));
        }
        
        // Apply sort
        const sortField = sort === 'latest' ? 'timestamp' : 
                         sort === 'price-high' ? 'price' : 
                         sort === 'price-low' ? 'price' : 'timestamp';
        const sortOrder = sort === 'price-low' ? 'asc' : 'desc';
        q = query(q, orderBy(sortField, sortOrder));
        
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert timestamp to Date
            timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));
    } catch (error) {
        console.error('Error getting vehicles:', error);
        return [];
    }
}

/**
 * Get single vehicle by ID
 */
export async function getVehicleById(id) {
    try {
        const snap = await getDoc(doc(db, CONFIG.collections.vehicles, id));
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting vehicle:', error);
        return null;
    }
}

/**
 * Add new vehicle (Admin can add)
 */
export async function addVehicle(data) {
    try {
        const docRef = await addDoc(collection(db, CONFIG.collections.vehicles), {
            ...data,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString(),
            adminAdded: true,
            adminEmail: state.currentUser?.email
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding vehicle:', error);
        throw error;
    }
}

/**
 * Update vehicle
 */
export async function updateVehicle(id, data) {
    try {
        await updateDoc(doc(db, CONFIG.collections.vehicles, id), {
            ...data,
            updatedAt: new Date().toISOString(),
            updatedBy: state.currentUser?.email
        });
        return true;
    } catch (error) {
        console.error('Error updating vehicle:', error);
        throw error;
    }
}

/**
 * Delete vehicle and its image
 */
export async function deleteVehicle(id) {
    try {
        // Get vehicle data first
        const vehicle = await getVehicleById(id);
        if (!vehicle) throw new Error('Vehicle not found');
        
        // Delete image from storage if exists
        if (vehicle.imageUrl) {
            await deleteImageFromUrl(vehicle.imageUrl);
        }
        
        // Delete from Firestore
        await deleteDoc(doc(db, CONFIG.collections.vehicles, id));
        
        return true;
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
    }
}

/**
 * Bulk delete vehicles
 */
export async function bulkDeleteVehicles(ids) {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, CONFIG.collections.vehicles, id));
        });
        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error bulk deleting:', error);
        throw error;
    }
}

// =============================================
// USERS MANAGEMENT
// =============================================

/**
 * Get all users from vehicles
 */
export async function getAllUsers() {
    try {
        const vehicles = await getAllVehicles();
        const userMap = new Map();
        
        vehicles.forEach(v => {
            if (v.userId) {
                if (!userMap.has(v.userId)) {
                    userMap.set(v.userId, {
                        id: v.userId,
                        email: v.userEmail || 'N/A',
                        phone: v.phone || 'N/A',
                        vehicles: [],
                        joined: v.timestamp || new Date()
                    });
                }
                userMap.get(v.userId).vehicles.push(v);
            }
        });
        
        return Array.from(userMap.values());
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

/**
 * Get user's vehicles
 */
export async function getUserVehicles(userId) {
    try {
        const q = query(
            collection(db, CONFIG.collections.vehicles),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting user vehicles:', error);
        return [];
    }
}

// =============================================
// IMAGE MANAGEMENT
// =============================================

/**
 * Upload image to Firebase Storage
 */
export async function uploadVehicleImage(file, path = 'vehicles/') {
    try {
        const fileName = Date.now() + '_' + file.name;
        const storageRef = ref(storage, path + fileName);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

/**
 * Delete image from storage by URL
 */
export async function deleteImageFromUrl(url) {
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

/**
 * Compress image before upload
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
        };
    });
}

// =============================================
// RENDER FUNCTIONS
// =============================================

/**
 * Render vehicles in table
 */
export function renderVehicles(vehicles) {
    const tbody = DOM.vehiclesList;
    if (!tbody) return;
    
    if (!vehicles || vehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:40px;color:#888;">
                    <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    कोई गाड़ी नहीं मिली
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = vehicles.map((v, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div class="vehicle-info">
                    <img src="${v.imageUrl || 'https://via.placeholder.com/40'}" 
                         alt="${v.title}" 
                         onerror="this.src='https://via.placeholder.com/40'" />
                    <span>${v.title || 'No Title'}</span>
                </div>
            </td>
            <td><span class="badge ${v.type}">${v.type === 'bike' ? '🏍️ बाइक' : '🚗 कार'}</span></td>
            <td>₹${(v.price || 0).toLocaleString()}</td>
            <td>${v.city || 'वाराणसी'}</td>
            <td>${v.userEmail || 'N/A'}</td>
            <td>${formatDate(v.timestamp)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="window.admin.viewVehicle('${v.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="window.admin.editVehicle('${v.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="window.admin.deleteVehicle('${v.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Render recent vehicles on dashboard
 */
function renderRecentVehicles(vehicles) {
    const tbody = DOM.recentVehicles;
    if (!tbody) return;
    
    if (!vehicles || vehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:30px;color:#888;">
                    कोई हाल ही की गाड़ी नहीं
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = vehicles.map((v, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div class="vehicle-info">
                    <img src="${v.imageUrl || 'https://via.placeholder.com/40'}" 
                         alt="${v.title}" 
                         onerror="this.src='https://via.placeholder.com/40'" />
                    <span>${v.title || 'No Title'}</span>
                </div>
            </td>
            <td><span class="badge ${v.type}">${v.type === 'bike' ? '🏍️ बाइक' : '🚗 कार'}</span></td>
            <td>₹${(v.price || 0).toLocaleString()}</td>
            <td>${v.city || 'वाराणसी'}</td>
            <td>${v.userEmail || 'N/A'}</td>
            <td><span class="status-badge active">Active</span></td>
            <td>
                <button class="btn-icon" onclick="window.admin.viewVehicle('${v.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon delete" onclick="window.admin.deleteVehicle('${v.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Render users grid
 */
export function renderUsers(users) {
    const grid = DOM.usersList;
    if (!grid) return;
    
    if (!users || users.length === 0) {
        grid.innerHTML = `
            <div class="no-data">
                <i class="fas fa-users-slash" style="font-size:3rem;color:#ddd;"></i>
                <p>कोई यूज़र नहीं मिला</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = users.map(u => `
        <div class="user-card">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.email)}&background=d4a373&color=fff&size=80" 
                 alt="${u.email}" />
            <h3>${u.email}</h3>
            <p><i class="fas fa-car"></i> ${u.vehicles?.length || 0} गाड़ियाँ</p>
            <p><i class="fas fa-calendar"></i> ${formatDate(u.joined)}</p>
            <div class="user-actions">
                <button onclick="window.admin.viewUserVehicles('${u.id}')" class="btn-view-user">
                    <i class="fas fa-eye"></i> गाड़ियाँ देखें
                </button>
            </div>
        </div>
    `).join('');
}

// =============================================
// CHARTS
// =============================================

let charts = {};

/**
 * Initialize charts
 */
function initCharts(vehicles) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
    
    // Type Chart (Pie)
    const bikes = vehicles.filter(v => v.type === 'bike').length;
    const cars = vehicles.filter(v => v.type === 'car').length;
    
    if (DOM.typeChart) {
        charts.type = new Chart(DOM.typeChart, {
            type: 'pie',
            data: {
                labels: ['बाइक', 'कार'],
                datasets: [{
                    data: [bikes, cars],
                    backgroundColor: ['#2a6bb0', '#b85c1a'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Vehicles Chart (Line - Last 7 days)
    if (DOM.vehiclesChart) {
        const days = ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'];
        const data = generateWeeklyData(vehicles);
        
        charts.vehicles = new Chart(DOM.vehiclesChart, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'नई गाड़ियाँ',
                    data: data,
                    borderColor: '#d4a373',
                    backgroundColor: 'rgba(212, 163, 115, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#d4a373'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Revenue Chart (if exists)
    if (DOM.revenueChart) {
        // Mock revenue data
        const months = ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून'];
        const revenue = months.map(() => Math.floor(Math.random() * 500000) + 100000);
        
        charts.revenue = new Chart(DOM.revenueChart, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'रेवेन्यू (₹)',
                    data: revenue,
                    backgroundColor: 'rgba(212, 163, 115, 0.6)',
                    borderColor: '#d4a373',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }
}

/**
 * Generate weekly data from vehicles
 */
function generateWeeklyData(vehicles) {
    const data = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    
    vehicles.forEach(v => {
        if (v.timestamp) {
            const date = new Date(v.timestamp);
            if (date >= weekStart) {
                const dayIndex = Math.floor((date - weekStart) / (1000 * 60 * 60 * 24));
                if (dayIndex >= 0 && dayIndex < 7) {
                    data[dayIndex]++;
                }
            }
        }
    });
    
    return data;
}

// =============================================
// PAGINATION
// =============================================

/**
 * Update pagination
 */
export function updatePagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / CONFIG.perPage) || 1;
    state.totalPages = totalPages;
    state.currentPage = currentPage;
    
    if (DOM.pageInfo) {
        DOM.pageInfo.textContent = `पेज ${currentPage} / ${totalPages}`;
    }
    
    // Update buttons
    const prevBtn = document.querySelector('.pagination .prev');
    const nextBtn = document.querySelector('.pagination .next');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Get paginated data
 */
export function paginateData(data, page) {
    const start = (page - 1) * CONFIG.perPage;
    const end = start + CONFIG.perPage;
    return data.slice(start, end);
}

// =============================================
// FILTERS & SEARCH
// =============================================

/**
 * Filter vehicles by type and search
 */
export function filterVehicles(vehicles, type, search) {
    let filtered = [...vehicles];
    
    // Filter by type
    if (type && type !== 'all') {
        filtered = filtered.filter(v => v.type === type);
    }
    
    // Filter by search
    if (search && search.trim()) {
        const query = search.toLowerCase().trim();
        filtered = filtered.filter(v => 
            v.title?.toLowerCase().includes(query) ||
            v.description?.toLowerCase().includes(query) ||
            v.city?.toLowerCase().includes(query) ||
            v.userEmail?.toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

/**
 * Sort vehicles
 */
export function sortVehicles(vehicles, sortBy) {
    const sorted = [...vehicles];
    
    switch (sortBy) {
        case 'latest':
            sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'price-high':
            sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'price-low':
            sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'title-asc':
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'title-desc':
            sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            break;
    }
    
    return sorted;
}

// =============================================
// MODAL FUNCTIONS
// =============================================

/**
 * Open edit modal
 */
export function openEditModal(vehicle) {
    if (!DOM.editModal) return;
    
    state.selectedVehicle = vehicle;
    
    // Fill form
    const form = DOM.editForm;
    if (form) {
        form.querySelector('#editId').value = vehicle.id;
        form.querySelector('#editTitle').value = vehicle.title || '';
        form.querySelector('#editPrice').value = vehicle.price || '';
        form.querySelector('#editCity').value = vehicle.city || '';
        form.querySelector('#editDesc').value = vehicle.description || '';
        form.querySelector('#editType').value = vehicle.type || 'bike';
        form.querySelector('#editYear').value = vehicle.year || '';
        form.querySelector('#editKm').value = vehicle.km || '';
        form.querySelector('#editPhone').value = vehicle.phone || '';
    }
    
    DOM.editModal.style.display = 'flex';
}

/**
 * Open view modal
 */
export function openViewModal(vehicle) {
    if (!DOM.viewModal) return;
    
    const content = DOM.viewModal.querySelector('.view-content');
    if (content) {
        content.innerHTML = `
            <div class="view-image">
                <img src="${vehicle.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                     alt="${vehicle.title}" />
            </div>
            <div class="view-details">
                <h2>${vehicle.title || 'No Title'}</h2>
                <p class="price">₹${(vehicle.price || 0).toLocaleString()}</p>
                <div class="view-meta">
                    <span><i class="fas fa-tag"></i> ${vehicle.type === 'bike' ? '🏍️ बाइक' : '🚗 कार'}</span>
                    <span><i class="fas fa-calendar"></i> ${vehicle.year || 'N/A'}</span>
                    <span><i class="fas fa-tachometer-alt"></i> ${vehicle.km?.toLocaleString() || 0} km</span>
                </div>
                <div class="view-location">
                    <i class="fas fa-map-marker-alt"></i> ${vehicle.city || 'वाराणसी'}
                </div>
                <div class="view-description">
                    <h4>विवरण</h4>
                    <p>${vehicle.description || 'कोई विवरण नहीं'}</p>
                </div>
                <div class="view-user">
                    <h4>मालिक</h4>
                    <p><i class="fas fa-envelope"></i> ${vehicle.userEmail || 'N/A'}</p>
                    <p><i class="fas fa-phone"></i> ${vehicle.phone || 'N/A'}</p>
                </div>
            </div>
        `;
    }
    
    DOM.viewModal.style.display = 'flex';
}

/**
 * Close modal
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Format date
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        return d.toLocaleDateString('hi-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return 'N/A';
    }
}

/**
 * Show loading spinner
 */
export function showLoading(show) {
    state.loading = show;
    if (DOM.loadingSpinner) {
        DOM.loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Show error message
 */
export function showError(message) {
    // Show toast or alert
    console.error(message);
    // Could use a toast library here
    // For now, simple alert
    // alert('❌ ' + message);
}

/**
 * Show success message
 */
export function showSuccess(message) {
    console.log('✅', message);
    // Could use a toast library here
    // For now, simple alert
    // alert('✅ ' + message);
}

/**
 * Export CSV from data
 */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('❌ कोई डेटा नहीं है!');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header] || '';
            return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    const csv = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Get user's IP (for analytics)
 */
export async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// =============================================
// EXPOSE GLOBALLY (for inline onclick handlers)
// =============================================

// Create global admin object
window.admin = {
    // Authentication
    initAdminAuth,
    logoutAdmin,
    
    // Dashboard
    loadDashboard,
    
    // Vehicles
    getAllVehicles,
    getVehicleById,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    bulkDeleteVehicles,
    
    // Users
    getAllUsers,
    getUserVehicles,
    
    // Images
    uploadVehicleImage,
    deleteImageFromUrl,
    compressImage,
    
    // Render
    renderVehicles,
    renderUsers,
    
    // Modals
    openEditModal,
    openViewModal,
    closeModal,
    viewVehicle: (id) => {
        window.open(`../vehicle-detail.html?id=${id}`, '_blank');
    },
    editVehicle: async (id) => {
        const vehicle = await getVehicleById(id);
        if (vehicle) openEditModal(vehicle);
    },
    deleteVehicle: async (id) => {
        if (!confirm('क्या आप सच में यह गाड़ी डिलीट करना चाहते हैं?')) return;
        try {
            await deleteVehicle(id);
            showSuccess('गाड़ी डिलीट हो गई!');
            window.location.reload();
        } catch (error) {
            showError(error.message);
        }
    },
    viewUserVehicles: (userId) => {
        window.location.href = `manage-vehicles.html?userId=${userId}`;
    },
    
    // Filters
    filterVehicles,
    sortVehicles,
    
    // Pagination
    updatePagination,
    paginateData,
    
    // Export
    exportToCSV,
    
    // Utilities
    formatDate,
    showLoading,
    showError,
    showSuccess,
    getUserIP
};

// =============================================
// AUTO INIT (if page has admin class)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on an admin page
    const isAdminPage = document.body.classList.contains('admin-page') || 
                        window.location.pathname.includes('/admin/');
    
    if (isAdminPage) {
        // Initialize admin
        window.admin.initAdminAuth().then(() => {
            // Load dashboard if on index
            if (window.location.pathname.endsWith('index.html') || 
                window.location.pathname.endsWith('/admin/')) {
                window.admin.loadDashboard();
            }
        }).catch((error) => {
            console.error('Admin init failed:', error);
        });
    }
});

// =============================================
// EXPORT FOR MODULE USAGE
// =============================================

export default {
    ...window.admin,
    state,
    CONFIG
};