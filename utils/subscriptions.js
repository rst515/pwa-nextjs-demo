// Simple in-memory store for demo/dev. Replace with DB in production.

// Use a process-wide global so separate route bundles share the same array.
const globalKey = '__SUBSCRIPTIONS_STORE__';
const store = (globalThis[globalKey] ||= []);

export function addSubscription(sub) {
  store.push(sub);
  console.log(`Saved ${store.length} subscription(s)`);
}

export function getSubscriptions() {
  console.log(`Returning ${store.length} subscriptions`);
  return store;
}

export function removeSubscriptionByEndpoint(endpoint) {
    if (!endpoint) return false;
    const idx = store.findIndex(s => s?.endpoint === endpoint);
    if (idx !== -1) {
        store.splice(idx, 1);
        console.log(`Removed subscription. Now ${store.length} subscription(s)`);
        return true;
    }
    console.log('No matching subscription to remove');
    return false;
}
