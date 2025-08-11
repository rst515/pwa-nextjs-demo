// Increment an app badge on push, persist count, and clear on click

// Minimal IndexedDB helpers for persisting the badge count
const DB_NAME = 'app-badge-db';
const STORE_NAME = 'kv';
const COUNT_KEY = 'badgeCount';

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbSet(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function getBadgeCount() {
    const v = await idbGet(COUNT_KEY);
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

async function setBadgeCount(count) {
    await idbSet(COUNT_KEY, count);
    // Prefer ServiceWorkerRegistration Badging API where supported
    if (self.registration && typeof self.registration.setAppBadge === 'function') {
        try {
            await self.registration.setAppBadge(count);
        } catch {
            // Ignore if not supported or permission issues
        }
    }
}

async function clearBadge() {
    await idbSet(COUNT_KEY, 0);
    if (self.registration && typeof self.registration.clearAppBadge === 'function') {
        try {
            await self.registration.clearAppBadge();
        } catch {
            // Ignore if not supported
        }
    }
}

self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};
    event.waitUntil((async () => {
        // 1) Increment and set the app badge (numeric) when a new message arrives
        const current = await getBadgeCount();
        await setBadgeCount(current + 1);

        // 2) Show the notification; include a badge icon as a visual fallback
        // Replace the icon/badge paths with your own assets
        await self.registration.showNotification(data.title || 'Notification', {
            body: data.body || '',
            // Optional: use a consistent tag so subsequent pushes can re-notify instead of piling up
            tag: 'message',
            renotify: true,
            // Fallback icons (monochrome badge is used on some platforms like Android)
            icon: '/icons/icon.png',
            badge: '/icons/icon.png',
            data: {
                url: data.url || '/', // Where to navigate on click
            },
        });
    })());
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil((async () => {
        // Clear the badge when the user interacts with the notification
        await clearBadge();

        // Focus an existing client or open a new one
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

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

// Optional: also clear the badge when a client becomes focused (e.g., user returns to the app)
self.addEventListener('message', async (event) => {
    if (event && event.data && event.data.type === 'CLEAR_BADGE') {
        await clearBadge();
    }
});
