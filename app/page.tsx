'use client';

import Image from "next/image";
import React from "react";
import {subscribeToPush, unsubscribeFromPush} from '@/utils/push-client';

type SubsResponse = { count: number; subscriptions: unknown[]; };
type NotifItem = { id: string; title: string; body: string; url?: string; timestamp: number; };

export default function Home() {
    const [subscriptions, setSubscriptions] = React.useState<unknown[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Notifications state
    const [unread, setUnread] = React.useState(0);
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<NotifItem[]>([]);
    const panelRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        async function registerSW() {
            try {
                if (!('serviceWorker' in navigator)) return;

                // If already registered, do nothing
                const existing = await navigator.serviceWorker.getRegistration('/');
                if (existing) return;

                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                if (cancelled) return;

                // Optional: log lifecycle and auto-take-control
                reg.addEventListener?.('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // An update was installed; you could prompt the user or auto-reload
                            // window.location.reload();
                        }
                    });
                });

                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    // SW took control of the page; could refresh UI if needed
                    // console.log('Service worker controller changed');
                });
            } catch (err) {
                console.error('SW register error', err);
            }
        }

        registerSW();
        return () => { cancelled = true; };
    }, []);

    const loadSubscriptions = React.useCallback(async () => {
        try {
            const res = await fetch('/api/save-subscription', {method: 'GET', cache: 'no-store'});
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

    // SW message listener: keep unread and live list in sync
    React.useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const onMessage = async (event: MessageEvent) => {
            const msg = event.data ?? {};
            if (msg.type === 'APPLY_BADGE') {
                const n = Number.isFinite(msg.count) ? (msg.count as number) : 0;
                setUnread(n);
                try {
                    if (n > 0) await (navigator as any).setAppBadge?.(n);
                    else await (navigator as any).clearAppBadge?.();
                } catch {
                }
            } else if (msg.type === 'PUSH_NOTIFICATION') {
                const {item, unread: n} = msg as { item: NotifItem; unread?: number };
                setItems(prev => [item, ...prev].slice(0, 50));
                if (typeof n === 'number') setUnread(n);
            } else if (msg.type === 'NOTIFICATIONS_SNAPSHOT') {
                const {items: snapshot} = msg as { items: NotifItem[] };
                setItems(Array.isArray(snapshot) ? snapshot : []);
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);

        // Sync current count on mount
        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                reg.active?.postMessage?.({type: 'SYNC_BADGE'});
            } catch {
            }
        })();

        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, []);

    // Ask SW for a snapshot via MessageChannel
    async function requestNotificationsSnapshot(): Promise<NotifItem[]> {
        try {
            const reg = await navigator.serviceWorker.ready;
            if (!reg.active) return [];
            const channel = new MessageChannel();
            const result = await new Promise<NotifItem[]>((resolve) => {
                const timeout = setTimeout(() => resolve([]), 2000);
                channel.port1.onmessage = (e: MessageEvent) => {
                    clearTimeout(timeout);
                    const data = e.data ?? {};
                    if (data.type === 'NOTIFICATIONS_SNAPSHOT' && Array.isArray(data.items)) {
                        resolve(data.items as NotifItem[]);
                    } else {
                        resolve([]);
                    }
                };
                reg.active!.postMessage({type: 'SYNC_NOTIFICATIONS'}, [channel.port2]);
            });
            return result;
        } catch {
            return [];
        }
    }

    // Open panel: load snapshot first, then clear counts/badge
    const openPanelAndLoad = React.useCallback(async () => {
        setOpen(true);

        // 1) Load stored notifications
        const snapshot = await requestNotificationsSnapshot();
        setItems(Array.isArray(snapshot) ? snapshot : []);

        // 2) Clear unread locally + badge
        setUnread(0);
        try {
            await (navigator as any).clearAppBadge?.();
        } catch {
        }

        // 3) Tell SW to zero persisted count
        try {
            const reg = await navigator.serviceWorker.ready;
            reg.active?.postMessage?.({type: 'CLEAR_BADGE'});
        } catch {
        }
    }, []);

    const togglePanel = React.useCallback(() => {
        setOpen(prev => {
            if (!prev) void openPanelAndLoad();
            else return false;
            return true;
        });
    }, [openPanelAndLoad]);

    // Close on outside click and Escape
    React.useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (panelRef.current && target && !panelRef.current.contains(target)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

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
            // Also clear the badge locally
            try {
                await (navigator as any).clearAppBadge?.();
            } catch {
            }
            setUnread(0);
        } finally {
            setLoading(false);
        }
    };

    async function clearNotifications() {
        try {
            // Optimistic UI clear
            setItems([]);
            setUnread(0);
            try {
                await (navigator as any).clearAppBadge?.();
            } catch {
            }

            const reg = await navigator.serviceWorker.ready;

            // Use MessageChannel, then verify by requesting a fresh snapshot
            if (reg.active) {
                const channel = new MessageChannel();
                const ack = new Promise<void>((resolve) => {
                    const timeout = setTimeout(() => resolve(), 2000);
                    channel.port1.onmessage = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                });
                reg.active.postMessage({type: 'CLEAR_NOTIFICATIONS'}, [channel.port2]);
                await ack;

                // Confirm empty state from SW snapshot
                const snapCh = new MessageChannel();
                const snap = await new Promise<{ items: any[] }>((resolve) => {
                    const timeout = setTimeout(() => resolve({items: []}), 2000);
                    snapCh.port1.onmessage = (e: MessageEvent) => {
                        clearTimeout(timeout);
                        resolve(e.data ?? {items: []});
                    };
                    reg.active!.postMessage({type: 'SYNC_NOTIFICATIONS'}, [snapCh.port2]);
                });
                setItems(Array.isArray(snap.items) ? snap.items : []);
            }
        } catch {
            console.error('Failed to clear notifications');
        }
    }


    const isSubscribed = subscriptions.length > 0;

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            {/* Header */}
            <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left">
                <Image className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert" src="/next.svg"
                       alt="Next.js Logo" width={180} height={37} priority/>
                |
                <h1 className="text-lg font-medium">PWA with Push Notifications</h1>
            </div>

            {/* Notifications bell (fixed top-right) */}
            <div className="fixed top-4 right-4 z-50">
                <button aria-label="Notifications"
                        className="relative p-2 rounded-full hover:bg-white/10 transition text-gray-300"
                        onClick={togglePanel}>
                    <svg width="24" height="24" viewBox="0 0 24 24"
                         className={`${unread > 0 ? 'text-yellow-300' : 'text-gray-300'}`} fill="currentColor"
                         aria-hidden="true">
                        <path
                            d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 6 14h12a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z"/>
                    </svg>
                    {unread > 0 && (
                        <span
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">
              {unread > 99 ? '99+' : unread}
            </span>
                    )}
                </button>

                {open && (
                    <div ref={panelRef}
                         className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg shadow-lg bg-white text-gray-900 z-50 border border-gray-200">
                        <div className="flex items-center justify-between px-3 py-2 border-b">
                            <span className="font-medium">Notifications</span>
                            <div className="flex items-center gap-3">
                                <button
                                    className="text-sm text-red-600 hover:underline"
                                    onClick={clearNotifications}
                                >
                                    Clear
                                </button>
                                <button
                                    className="text-sm text-blue-600 hover:underline"
                                    onClick={() => setOpen(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <ul className="divide-y">
                            {items.length === 0 ? (
                                <li className="px-3 py-4 text-sm text-gray-500">No notifications</li>
                            ) : items.map(n => (
                                <li key={n.id} className="px-3 py-3 hover:bg-gray-50">
                                    <a href={n.url || '/'} className="block">
                                        <div className="text-sm font-medium">{n.title}</div>
                                        {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                                        <div
                                            className="mt-1 text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

            </div>

            {/* Status text */}
            <p className="px-4 text-center">
                You care currently <b>
                {isSubscribed ? <text style={{color: "green"}}>subscribed</text> :
                    <text style={{color: "darkred"}}>not subscribed</text>}
            </b> to notifications.
            </p>

            {/* Actions */}
            <div className="w-full max-w-md sm:max-w-2xl">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-700/80 p-4 sm:p-5 rounded-xl"
                     style={{justifyContent: 'space-between'}}>
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