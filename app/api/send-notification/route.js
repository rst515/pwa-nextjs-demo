export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import webpush from 'web-push';
import { getSubscriptions } from '../../../utils/subscriptions.js';

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
  tag: 'weekly-summary',
  renotify: true,
  requireInteraction: true,
  vibrate: [100, 50, 100],
  timestamp: Date.now(),
  actions: [
    { action: 'open-reports', title: 'Open reports' },
    { action: 'dismiss', title: 'Dismiss' }
  ],
  data: {
    url: 'https://example.com/reports',
    reportIds: ['rep-001', 'rep-002', 'rep-003'],
    unreadCount: 1
  }
});

export async function GET() {
  const subs = getSubscriptions();
  console.log(`${new Date().toTimeString()} Sending to ${subs.length} subscription(s)`);

  if (!subs.length) {
    return new Response(JSON.stringify({ sent: false, count: 0, error: 'No subscriptions' }), { status: 200 });
  }

  const results = await Promise.allSettled(subs.map(sub => webpush.sendNotification(sub, payload)));
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - succeeded;

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`sendNotification error [${i}]:`, r.reason);
    }
  });

  return new Response(JSON.stringify({ sent: succeeded > 0, count: subs.length, succeeded, failed }), { status: 200 });
}
