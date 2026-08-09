// Offline quick-entry queue (Phase 9). IndexedDB, not localStorage — the
// service worker's best-effort Background Sync wake-up needs to read it
// too, and raw indexedDB works from both contexts with no extra dependency.
//
// Draining happens from the page (via the authenticated supabase-js client
// already running there), not from inside the service worker — a SW can't
// easily share the page's Supabase session, and Background Sync isn't
// supported on iOS Safari anyway. The SW's role is purely to opportunistically
// wake and message an open client to drain; correctness never depends on it
// (the page also drains on `online` events and on mount).

import type { NewTransaction } from "@/lib/api/types";

const DB_NAME = "jtracker-offline";
const STORE = "queue";

export type QueuedEntry = NewTransaction & { queuedAt: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(entry: NewTransaction): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      ...entry,
      queuedAt: new Date().toISOString(),
    } satisfies QueuedEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listQueued(): Promise<{ key: IDBValidKey; entry: QueuedEntry }[]> {
  const db = await openDb();
  const out = await new Promise<{ key: IDBValidKey; entry: QueuedEntry }[]>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const results: { key: IDBValidKey; entry: QueuedEntry }[] = [];
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          results.push({ key: cursor.key, entry: cursor.value as QueuedEntry });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    }
  );
  db.close();
  return out;
}

export async function removeQueued(key: IDBValidKey): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Replay every queued entry via `createFn` (the real authenticated
 * createTransaction), removing each on success. Stops at the first failure
 * so a persistent problem (e.g. still offline) doesn't spin through the
 * whole queue uselessly — the rest stay queued for the next drain.
 */
export async function drainQueue(
  createFn: (entry: NewTransaction) => Promise<unknown>
): Promise<number> {
  const items = await listQueued();
  let synced = 0;
  for (const { key, entry } of items) {
    const { queuedAt: _queuedAt, ...payload } = entry;
    try {
      await createFn(payload);
      await removeQueued(key);
      synced++;
    } catch {
      break;
    }
  }
  return synced;
}
