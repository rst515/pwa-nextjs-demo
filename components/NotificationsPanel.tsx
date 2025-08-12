import React from "react";
import {NotifItem} from '@/utils/types'

export function NotificationsPanel(
    {
        open,
        panelRef,
        items,
        onClear,
        onClose,
    }: Readonly<{
        open: boolean;
        panelRef: React.RefObject<HTMLDivElement>;
        items: NotifItem[];
        onClear: () => void | Promise<void>;
        onClose: () => void;
    }>) {
    if (!open) return null;
    return (
        <div
            ref={panelRef}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg shadow-lg bg-white text-gray-900 z-50 border border-gray-200"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="font-medium">Notifications</span>
                <div className="flex items-center gap-3">
                    <button className="text-sm text-red-600 hover:underline" onClick={onClear}>
                        Clear
                    </button>
                    <button className="text-sm text-blue-600 hover:underline" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
            <ul className="divide-y">
                {items.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-gray-500">No notifications</li>
                ) : (
                    items.map((n) => (
                        <li key={n.id} className="px-3 py-3 hover:bg-gray-50">
                            <a href={n.url || '/'} className="block">
                                <div className="text-sm font-medium">{n.title}</div>
                                {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                                <div className="mt-1 text-xs text-gray-400">
                                    {new Date(n.timestamp).toLocaleString()}
                                </div>
                            </a>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}