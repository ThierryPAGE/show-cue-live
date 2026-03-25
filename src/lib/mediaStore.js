// IndexedDB store for media blobs — accessible from all windows of the same origin
const DB_NAME = 'scl-media-store';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function storeBlob(blob) {
  const id = crypto.randomUUID();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Resolve idb://<uuid> to a local blob URL, or return the URL as-is
export async function resolveMediaUrl(url) {
  if (!url || !url.startsWith('idb://')) return url;
  const id = url.slice(6);
  const blob = await getBlob(id);
  if (!blob) throw new Error(`Media not found in store: ${id}`);
  return URL.createObjectURL(blob);
}
