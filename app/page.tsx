'use client';

import Image from "next/image";
import React from "react";
import { subscribeToPush, unsubscribeFromPush } from '@/utils/push-client';
import { useServiceWorkerRegistration } from '@/hooks/use-service-worker-registration';
import { usePushSubscriptions } from '@/hooks/use-push-subscriptions';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationsBell } from '@/components/NotificationsBell';
import { NotificationsPanel } from '@/components/NotificationsPanel';

export default function Home() {
  useServiceWorkerRegistration();

  const { subscriptions, isSubscribed, reload } = usePushSubscriptions();
  const {
    unread,
    setUnread,
    open,
    togglePanel,
    items,
    panelRef,
    clearNotifications,
    clearBadge,
    closePanel,
  } = useNotifications();

  const [loading, setLoading] = React.useState(false);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      await subscribeToPush();
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      await reload();
      await clearBadge();
      setUnread(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
          <text className="hidden sm:block">|</text>
          <h1 className="text-lg font-medium">PWA with Push Notifications</h1>
      </div>

      {/* Notifications bell (fixed top-right) */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationsBell unread={unread} onClick={togglePanel} />
        <NotificationsPanel
          open={open}
          panelRef={panelRef}
          items={items}
          onClear={clearNotifications}
          onClose={closePanel}
        />
      </div>

      {/* Status text */}
        <div className="w-full max-w-xl m-auto rounded-xl border-[1px] border-purple-600 shadow-xl p-6 shadow-purple-950" >
            <p className="px-4 text-center">
                You are currently{' '}
                <span className={`font-semibold ${isSubscribed ? 'text-green-600' : 'text-red-700'}`}>
                  {isSubscribed ? 'subscribed' : 'not subscribed'}
                </span>{' '}
                to notifications
            </p>
        </div>

      {/* Actions */}
      <div className="w-full max-w-md sm:max-w-2xl">
        <div
          className="flex flex-col md:flex-row gap-3 sm:gap-4 bg-gray-700/80 p-4 sm:p-5 rounded-xl"
          style={{ justifyContent: 'space-between' }}
        >
          <button
            className={`relative inline-flex items-center justify-center whitespace-nowrap w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl text-white transition-opacity ${
              loading || isSubscribed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'
            } ${isSubscribed ? 'bg-green-700/50' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={handleEnableNotifications}
            disabled={loading || isSubscribed}
          >
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
            <span className="opacity-0">Disable Notifications</span>
            <span className="absolute inset-0 flex items-center justify-center">
              {loading && isSubscribed ? 'Disabling…' : 'Disable Notifications'}
            </span>
          </button>

          <button
            className={`relative inline-flex items-center justify-center whitespace-nowrap w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl transition-opacity ${
            // className={`w-full sm:w-auto text-sm sm:text-base px-4 py-3 rounded-xl transition-opacity ${
              loading || !isSubscribed ? 'opacity-60 cursor-not-allowed' : 'opacity-100'
            } ${isSubscribed ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-400 text-gray-200'}`}
            onClick={async () => {
              console.log('Sending test notification...');
              await fetch('/api/send-notification');
            }}
            disabled={!isSubscribed || loading}
          >
            Send Notification
          </button>
        </div>
      </div>
    </main>
  );
}