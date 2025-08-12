export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import webpush from 'web-push';
import { getSubscriptions } from '../../../utils/subscriptions.js';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(LocalizedFormat)

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

if (!publicKey || !privateKey || !subject) {
  throw new Error('VAPID keys and subject are required');
}
webpush.setVapidDetails(subject, publicKey, privateKey);

const payloadTemplate = JSON.stringify({
  title: 'Weekly summary',
  // body: `Sent ${now.format('LLLL')}`,
  icon: '/icons/icon.png',
  badge: 'icons/gold_badge.png',
  tag: 'weekly-summary',
  renotify: true,
  requireInteraction: true,
  vibrate: [100, 50, 100],
  // timestamp: Date.now(),
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
  const now = dayjs().tz('Europe/London');
  const payloadObj = JSON.parse(payloadTemplate);
  payloadObj.body = `Sent ${now.format('LLLL')}`;
  payloadObj.timestamp = Date.now(); // ensure per-request timestamp
  const payload = JSON.stringify(payloadObj);

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
