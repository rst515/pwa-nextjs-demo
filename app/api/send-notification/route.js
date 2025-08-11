import webpush from 'web-push';
import { getSubscriptions } from '../save-subscription/route.js';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys and subject are required');
}
webpush.setVapidDetails(subject, publicKey, privateKey);

const payload = JSON.stringify({
    title: 'Weekly summary',
    body: 'You have 3 new reports ready.',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag: 'weekly-summary',          // groups similar notifications
    renotify: true,                 // vibrate/alert again if tag matches an existing one
    requireInteraction: true,       // stays until user interacts
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
    actions: [
        { action: 'open-reports', title: 'Open reports' },
        { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
        url: 'https://example.com/reports', // used on click
        reportIds: ['rep-001', 'rep-002', 'rep-003']
    }
});

export async function GET() {
  const subs = getSubscriptions();

  try {
    await Promise.all(
      subs.map(sub => {
        return webpush.sendNotification(sub, payload).catch(err => {
          console.error('sendNotification error', err);
        });
      })
    );
    return new Response(JSON.stringify({ sent: true, count: subs.length }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), { status: 500 });
  }
}
