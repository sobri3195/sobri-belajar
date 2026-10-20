import { stores, migrate, SCHEMA_VERSION } from "./migrations.js";
export { stores };
export const uid = () => crypto.randomUUID();
let connection;
export function openDB() {
  return (connection ||= new Promise((resolve, reject) => {
    const r = indexedDB.open("sobri-study", SCHEMA_VERSION);
    r.onupgradeneeded = (e) => migrate(r.result, e.oldVersion);
    r.onsuccess = () => {
      r.result.onversionchange = () => {
        r.result.close();
        connection = null;
      };
      resolve(r.result);
    };
    r.onerror = () => {
      connection = null;
      reject(r.error);
    };
    r.onblocked = () =>
      reject(
        new Error("Tutup tab aplikasi lain untuk memperbarui penyimpanan."),
      );
  }));
}
export async function transaction(names, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    try {
      work(tx);
    } catch (e) {
      tx.abort();
      reject(e);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaksi dibatalkan"));
  });
}
export async function all(s) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(s).objectStore(s).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function get(s, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(s).objectStore(s).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function put(s, item) {
  const record = {
    ...item,
    id: item.id || uid(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await transaction([s], "readwrite", (tx) => tx.objectStore(s).put(record));
  return record;
}
export async function remove(s, id) {
  await transaction([s], "readwrite", (tx) => tx.objectStore(s).delete(id));
}
