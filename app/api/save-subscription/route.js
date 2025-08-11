let subscriptions = [];

export async function POST(req) {
  try {
    const body = await req.json();
    subscriptions.push(body);
    console.log(`Saved ${subscriptions.length} subscription`);
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
      console.error(err);
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ count: subscriptions.length, subscriptions }), { status: 200 });
}

export function getSubscriptions() {
    console.log('getSubscriptions count: ', subscriptions.length);
    return subscriptions;
}
