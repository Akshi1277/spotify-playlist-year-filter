/**
 * IndexedDB Local Caching Layer
 * Provides instant 0ms reload times for previously analyzed playlists
 */

const DB_NAME = 'SpotifyPlaylistFilterDB';
const DB_VERSION = 1;
const STORE_NAME = 'playlist_cache';

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB opening error:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getCachedPlaylist(playlistId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(playlistId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);

        // Cache valid for 2 hours
        const isExpired = Date.now() - result.cachedAt > 2 * 60 * 60 * 1000;
        if (isExpired) {
          resolve(null);
        } else {
          resolve(result);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedPlaylist(playlistId, playlistInfo, tracks) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put({
        id: playlistId,
        playlistInfo,
        tracks,
        cachedAt: Date.now()
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function clearCachedPlaylist(playlistId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(playlistId);
      transaction.oncomplete = () => resolve(true);
    });
  } catch {
    return false;
  }
}
