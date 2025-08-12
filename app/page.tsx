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
      <div className="relative z-[-1] flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left before:absolute before:h-[220px] sm:before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[140px] sm:after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
        |
        <h1 className="text-lg font-medium">
            PWA with Push Notifications
        </h1>
      </div>

      <p className="px-4 text-center">You care currently <b>
          {isSubscribed ? <text style={{color: "green"}}>subscribed</text> :
              <text style={{color: "darkred"}}>not subscribed</text>}
      </b> to notifications.</p>

        <div className="w-full max-w-md sm:max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-700/80 p-4 sm:p-5 rounded-xl" style={{justifyContent: 'space-between'}}>
                <button
                    className={`relative inline-flex items-center justify-center whitespace-nowrap w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl text-white transition-opacity ${
                        loading || isSubscribed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'
                    } ${isSubscribed ? 'bg-green-700/50' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={handleEnableNotifications}
                    disabled={loading || isSubscribed}
                >
                    {/* Reserve width with the longest label to avoid resizing */}
                    <span className="opacity-0">Enable Notifications</span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      {loading && !isSubscribed ? 'Enabling…' : 'Enable Notifications'}
                    </span>
                </button>

                <button
                    className={`relative inline-flex items-center justify-center whitespace-nowrap w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl transition-opacity ${
                        loading || !isSubscribed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'
                    } ${isSubscribed ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-400 text-gray-200'}`}
                    onClick={handleDisableNotifications}
                    disabled={loading || !isSubscribed}
                >
                    {/* Reserve width with the longest label to avoid resizing */}
                    <span className="opacity-0">Disable Notifications</span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      {loading && isSubscribed ? 'Disabling…' : 'Disable Notifications'}
                    </span>
                </button>

                <button
                    className={`w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl transition-opacity ${
                        loading || !isSubscribed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'
                    } ${isSubscribed ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-400 text-gray-200'}`}
                    onClick={async () => {
                        console.log('Sending test notification...');
                        await fetch('/api/send-notification');
                    }}
                    disabled={!isSubscribed || loading}
                >
                    Send Test Notification
                </button>
            </div>
        </div>

    </main>
  );
}
