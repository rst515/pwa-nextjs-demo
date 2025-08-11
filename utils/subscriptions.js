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
