export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { addSubscription, getSubscriptions } from '../../../utils/subscriptions.js';

export async function POST(req) {
  try {
    const body = await req.json();
    addSubscription(body);
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
  }
}

export async function GET() {
  const subs = getSubscriptions();
  return new Response(JSON.stringify({ count: subs.length, subscriptions: subs }), { status: 200 });
}