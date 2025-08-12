'use client';

import React from "react";
import { NotifItem } from "@/utils/types";

export function useNotifications() {
    const [unread, setUnread] = React.useState(0);
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<NotifItem[]>([]);
    const panelRef = React.useRef<HTMLDivElement | null>(null);

    const setBadge = React.useCallback(async (n: number) => {
        try {
            if (n > 0) await (navigator as any).setAppBadge?.(n);
        else await (navigator as any).clearAppBadge?.();
        } catch {
            // noop
        }
    }, []);

    const clearBadge = React.useCallback(async () => {
        try {
            await (navigator as any).clearAppBadge?.();
        } catch {
            // noop
        }
    }, []);

    const requestNotificationsSnapshot = React.useCallback(async (): Promise<NotifItem[]> => {
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
                reg.active!.postMessage({ type: 'SYNC_NOTIFICATIONS' }, [channel.port2]);
            });
            return result;
        } catch {
            return [];
        }
    }, []);

    // SW message listener: unread, push events, snapshot updates
    React.useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const onMessage = async (event: MessageEvent) => {
            const msg = event.data ?? {};
            if (msg.type === 'APPLY_BADGE') {
                const n = Number.isFinite(msg.count) ? (msg.count as number) : 0;
                setUnread(n);
                await setBadge(n);
            } else if (msg.type === 'PUSH_NOTIFICATION') {
                const { item, unread: n } = msg as { item: NotifItem; unread?: number };
                setItems((prev) => [item, ...prev].slice(0, 50));
                if (typeof n === 'number') setUnread(n);
            } else if (msg.type === 'NOTIFICATIONS_SNAPSHOT') {
                const { items: snapshot } = msg as { items: NotifItem[] };
                setItems(Array.isArray(snapshot) ? snapshot : []);
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);

        // Sync current count on mount
        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                reg.active?.postMessage?.({ type: 'SYNC_BADGE' });
            } catch {
                // noop
            }
        })();

        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [setBadge]);

    const openPanelAndLoad = React.useCallback(async () => {
        setOpen(true);

        // 1) Load stored notifications
        const snapshot = await requestNotificationsSnapshot();
        setItems(Array.isArray(snapshot) ? snapshot : []);

        // 2) Clear unread locally + badge
        setUnread(0);
        await clearBadge();

        // 3) Tell SW to zero persisted count
        try {
            const reg = await navigator.serviceWorker.ready;
            reg.active?.postMessage?.({ type: 'CLEAR_BADGE' });
        } catch {
            // noop
        }
    }, [requestNotificationsSnapshot, clearBadge]);

    const togglePanel = React.useCallback(() => {
        setOpen((prev) => {
            if (!prev) void openPanelAndLoad();
            else return false;
            return true;
        });
    }, [openPanelAndLoad]);

    const closePanel = React.useCallback(() => {
        setOpen(false);
    }, []);

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

    const clearNotifications = React.useCallback(async () => {
        try {
            // Optimistic UI clear
            setItems([]);
            setUnread(0);
            await clearBadge();

            const reg = await navigator.serviceWorker.ready;

            if (reg.active) {
                // Ask SW to clear and wait for ack
                const channel = new MessageChannel();
                const ack = new Promise<void>((resolve) => {
                    const timeout = setTimeout(() => resolve(), 2000);
                    channel.port1.onmessage = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                });
                reg.active.postMessage({ type: 'CLEAR_NOTIFICATIONS' }, [channel.port2]);
                await ack;

                // Confirm empty state from SW snapshot
                const snapCh = new MessageChannel();
                const snap = await new Promise<{ items: any[] }>((resolve) => {
                    const timeout = setTimeout(() => resolve({ items: [] }), 2000);
                    snapCh.port1.onmessage = (e: MessageEvent) => {
                        clearTimeout(timeout);
                        resolve(e.data ?? { items: [] });
                    };
                    reg.active!.postMessage({ type: 'SYNC_NOTIFICATIONS' }, [snapCh.port2]);
                });
                setItems(Array.isArray(snap.items) ? snap.items : []);
            }
        } catch {
            console.error('Failed to clear notifications');
        }
    }, [clearBadge]);

    return {
        // state
        unread,
        setUnread,
        open,
        togglePanel,
        items,
        setItems,
        panelRef,
        // actions
        openPanelAndLoad,
        clearNotifications,
        // utils
        clearBadge,
        closePanel,
    };
}
