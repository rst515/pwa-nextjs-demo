// Increment an app badge on push, persist count, and clear on click

// IndexedDB helpers for persisting the badge count and notification messages list
const DB_NAME = 'app-badge-db';
const STORE_NAME = 'kv';
const COUNT_KEY = 'badgeCount';
const LIST_KEY = 'notificationsList'; // persisted notifications array (most recent first)
const WIPE_KEY = 'notificationsWipeAt';


// Optional: fallback in-memory storage if IDB is unavailable
let memoryStore = new Map();

function openDb() {
    return new Promise((resolve, reject) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}

async function idbGet(key) {
    try {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return memoryStore.get(key);
    }
}

async function idbSet(key, value) {
    try {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch {
        memoryStore.set(key, value);
    }
}

async function idbIncrement(key, delta) {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(key);
            getReq.onsuccess = () => {
                const current = (typeof getReq.result === 'number' && Number.isFinite(getReq.result)) ? getReq.result : 0;
                const next = current + delta;
                const putReq = store.put(next, key);
                putReq.onsuccess = () => resolve(next);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    } catch {
        const current = (typeof memoryStore.get(key) === 'number' && Number.isFinite(memoryStore.get(key))) ? memoryStore.get(key) : 0;
        const next = current + delta;
        memoryStore.set(key, next);
        return next;
    }
}

async function clearNotificationsList() {
    // Try to clear IDB
    try {
        await idbSet(LIST_KEY, []);
        await idbSet(WIPE_KEY, Date.now());
    } catch {
        // ignore
    }
    // Always clear the in-memory fallback too
    try {
        memoryStore.set(LIST_KEY, []);
        memoryStore.set(WIPE_KEY, Date.now());
    } catch {
        // ignore
    }
}


function clampCount(n) {
    return Math.max(0, Math.min(Number.isFinite(n) ? n : 0, 9999));
}

async function getBadgeCount() {
    const v = await idbGet(COUNT_KEY);
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

async function broadcastBadge(count) {
    try {
        const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of cs) {
            c.postMessage({ type: 'APPLY_BADGE', count });
        }
    } catch {
        // ignore
    }
}
async function clearBadge() {
    await idbSet(COUNT_KEY, 0);
    await broadcastBadge(0);
}

// Persist and fetch recent notifications
async function addNotificationItem(item) {
    const list = (await idbGet(LIST_KEY)) || [];
    list.unshift(item);
    if (list.length > 50) list.length = 50; // cap
    await idbSet(LIST_KEY, list);

    // IMPORTANT: clear the wipe marker so snapshots are not forced empty
    try {
        await idbSet(WIPE_KEY, null);
    } catch {
        // also clear in-memory fallback
        try { memoryStore.set(WIPE_KEY, null); } catch {}
    }
}

async function getNotificationsSnapshot() {
    // If there was a wipe, prefer returning empty and re-enforce empty list
    const wipedAt = await idbGet(WIPE_KEY);
    if (typeof wipedAt === 'number' && Number.isFinite(wipedAt)) {
        // Re-enforce empty list in IDB in case of partial writes
        try { await idbSet(LIST_KEY, []); } catch {}
        return [];
    }
    const list = (await idbGet(LIST_KEY)) || [];
    return Array.isArray(list) ? list : [];
}


// Ensure we take control and sync the current stored count to any open client
self.addEventListener('install', () => {
    self.skipWaiting?.();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        await self.clients.claim?.();
        const current = await getBadgeCount();
        await broadcastBadge(current);
    })());
});

self.addEventListener('push', function (event) {
    event.waitUntil((async () => {
        let data = {};
        try {
            data = event.data ? event.data.json() : {};
        } catch {
            try { data = { body: event.data?.text?.() ? await event.data.text() : '' }; } catch { data = {}; }
        }

        // Increment and broadcast via clients (navigator.setAppBadge in window)
        const next = await idbIncrement(COUNT_KEY, 1);
        const clamped = clampCount(next);
        await idbSet(COUNT_KEY, clamped);
        await broadcastBadge(clamped);
        console.log('Badge incremented to', clamped);

        // Build item, persist it, then notify any open windows
        const item = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: data.title || 'Notification',
            body: data.body || '',
            url: data.url || '/',
            timestamp: Date.now()
        };
        await addNotificationItem(item);

        try {
            const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            cs.forEach(c => c.postMessage({ type: 'PUSH_NOTIFICATION', item, unread: clamped }));
        } catch {}

        await self.registration.showNotification(data.title || 'Notification', {
            body: data.body || '',
            tag: data.tag || 'message',
            renotify: true,
            icon: data.icon || '/icons/icon.png',
            badge: data.badge || '/icons/icon.png',
            data: { url: data.url || '/', ...data.data },
            requireInteraction: !!data.requireInteraction,
            vibrate: data.vibrate,
            timestamp: data.timestamp || Date.now(),
            actions: Array.isArray(data.actions) ? data.actions : undefined,
        });
    })());
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil((async () => {
        await clearBadge();

        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const targetUrl = (event.notification?.data?.url) || '/';

        for (const client of allClients) {
            try {
                const url = new URL(client.url);
                if (url.pathname === new URL(targetUrl, self.location.origin).pathname && 'focus' in client) {
                    await client.focus();
                    return;
                }
            } catch {
                // noop
            }
        }
        if (clients.openWindow) {
            await clients.openWindow(targetUrl);
        }
    })());
});

// CONSOLIDATED: Single message listener that replies to the requester
self.addEventListener('message', async (event) => {
    const msg = event?.data;
    if (!msg || typeof msg !== 'object') return;

    // Helper to reply to the requester
    const reply = (payload) => {
        if (event.ports && event.ports[0]) {
            try { event.ports[0].postMessage(payload); return; } catch {}
        }
        if (event.source?.postMessage) {
            try { event.source.postMessage(payload); return; } catch {}
        }
        // Last resort: broadcast
        (async () => {
            try {
                const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                cs.forEach(c => c.postMessage(payload));
            } catch {}
        })();
    };

    if (msg.type === 'CLEAR_BADGE') {
        await clearBadge();
        reply({ type: 'APPLY_BADGE', count: 0 });
    } else if (msg.type === 'SYNC_BADGE') {
        const current = await getBadgeCount();
        reply({ type: 'APPLY_BADGE', count: current });
    } else if (msg.type === 'SYNC_NOTIFICATIONS') {
        const items = await getNotificationsSnapshot();
        reply({ type: 'NOTIFICATIONS_SNAPSHOT', items });
    } else if (msg.type === 'CLEAR_NOTIFICATIONS') {
        await clearNotificationsList();
        await clearBadge();
        reply({ type: 'NOTIFICATIONS_SNAPSHOT', items: [] });
    }
});
