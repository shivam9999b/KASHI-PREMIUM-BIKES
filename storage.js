// js/storage.js
import { storage } from './firebase.js';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===== UPLOAD IMAGE =====
export async function uploadImage(file, path = 'vehicles/') {
    return new Promise((resolve, reject) => {
        const fileName = Date.now() + '_' + file.name;
        const storageRef = ref(storage, path + fileName);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
                // You can update a progress bar here
            },
            (error) => {
                console.error('Upload error:', error);
                reject(error);
            },
            async () => {
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

// ===== UPLOAD MULTIPLE IMAGES =====
export async function uploadMultipleImages(files, path = 'vehicles/') {
    const urls = [];
    for (const file of files) {
        const url = await uploadImage(file, path);
        urls.push(url);
    }
    return urls;
}

// ===== DELETE IMAGE =====
export async function deleteImage(url) {
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        console.log('Image deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

// ===== GET ALL IMAGES =====
export async function getAllImages(path = 'vehicles/') {
    try {
        const listRef = ref(storage, path);
        const res = await listAll(listRef);
        const urls = await Promise.all(
            res.items.map(async (item) => {
                return await getDownloadURL(item);
            })
        );
        return urls;
    } catch (error) {
        console.error('Error getting images:', error);
        return [];
    }
}

// ===== IMAGE COMPRESSION (Client-side) =====
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