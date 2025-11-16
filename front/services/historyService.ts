import type { HistoryItem, UploadedImage } from '../types';

const DB_NAME = 'eRanker-thumbnail-db';
const DB_VERSION = 1;
const STORE_NAME = 'history';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject('IndexedDB is not supported by this browser.');
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject('Error opening IndexedDB.');
                dbPromise = null; // Allow retrying
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
};

// Helper to convert a data URL to a Blob
const dataURLtoBlob = (dataurl: string): Blob | null => {
    try {
        const arr = dataurl.split(',');
        if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    } catch (e) {
        console.error("Error converting data URL to Blob", e);
        return null;
    }
}


/**
 * Adds or updates a single history item in IndexedDB.
 * Converts data URLs to Blobs for more robust storage.
 * @param item The HistoryItem to save.
 */
export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Convert images to Blobs for storage
        const originalImageBlob = dataURLtoBlob(item.originalImage.src);
        const generatedImageBlobs = item.generatedImages.map(dataURLtoBlob).filter(b => b !== null) as Blob[];
        
        if (!originalImageBlob) {
            throw new Error("Failed to convert original image to Blob.");
        }
        
        const storableItem = {
            ...item,
            originalImage: { src: originalImageBlob, mimeType: item.originalImage.mimeType },
            generatedImages: generatedImageBlobs,
        };

        store.put(storableItem);

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Could not save history item to IndexedDB", error);
    }
};

/**
 * Loads all history items from IndexedDB, converting image Blobs back to URLs.
 * @returns A promise that resolves to an array of HistoryItems.
 */
export const loadHistory = async (): Promise<HistoryItem[]> => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const itemsFromDb: any[] = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        // Convert blobs back to Object URLs for display
        const items: HistoryItem[] = itemsFromDb.map(item => {
            const originalImageUrl = item.originalImage.src instanceof Blob ? URL.createObjectURL(item.originalImage.src) : item.originalImage.src;
            const generatedImageUrls = item.generatedImages.map((blob: Blob) => blob instanceof Blob ? URL.createObjectURL(blob) : blob);

            return {
                ...item,
                originalImage: { src: originalImageUrl, mimeType: item.originalImage.mimeType },
                generatedImages: generatedImageUrls,
            }
        });

        return items.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Could not load history from IndexedDB", error);
        return [];
    }
};

/**
 * Deletes a single history item by its ID from IndexedDB.
 * @param id The ID of the item to delete.
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Could not delete history item from IndexedDB", error);
    }
}

/**
 * Clears all items from the history object store in IndexedDB.
 */
export const clearHistory = async (): Promise<void> => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Could not clear history from IndexedDB", error);
    }
};