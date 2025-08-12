'use client';

import Image from "next/image";
import React from "react";
import { subscribeToPush, unsubscribeFromPush } from '@/utils/push-client';

type SubsResponse = {
  count: number;
  subscriptions: unknown[];
};

export default function Home() {
  const [subscriptions, setSubscriptions] = React.useState<unknown[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadSubscriptions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/save-subscription', { method: 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load subscriptions');
      const data: SubsResponse = await res.json();
      setSubscriptions(data.subscriptions ?? []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      await subscribeToPush();
      await loadSubscriptions();
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      await loadSubscriptions();
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = subscriptions.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="relative z-[-1] flex gap-6 place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
        |
        <h1 className="text-lg font-medium">PWA with Next.js</h1>
        |
        <p className="opacity-80">©imvinojanv</p>
      </div>

      <h1>Next.js PWA Push Demo (App Router)</h1>
      <p>You care currently <b>{isSubscribed ? '' : 'not'} subscribed</b> to notifications.</p>

      <div style={{display: 'flex', gap: 10, backgroundColor: 'darkgrey', padding: 10, borderRadius: 10}}>
        <button
          style={{backgroundColor: 'forestgreen', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 5, opacity: loading ? 0.7 : 1}}
          onClick={handleEnableNotifications}
          disabled={loading || isSubscribed}
        >
          {loading && !isSubscribed ? 'Enabling…' : 'Enable Notifications'}
        </button>
        <button
          style={{backgroundColor: 'crimson', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 5, opacity: loading ? 0.7 : 1}}
          onClick={handleDisableNotifications}
          disabled={loading || !isSubscribed}
        >
          {loading && isSubscribed ? 'Disabling…' : 'Disable Notifications'}
        </button>
        <button
          style={{backgroundColor: 'purple', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 5}}
          onClick={async () => {
            console.log('Sending test notification...');
            await fetch('/api/send-notification');
          }}
        >
          Send Test Notification
        </button>
      </div>
    </main>
  );
}
