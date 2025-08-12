import React from "react";

export function NotificationsBell(
    {
        unread,
        onClick,
    }: Readonly<{
        unread: number;
        onClick: () => void;
    }>) {
    return (
        <button
            aria-label="Notifications"
            className="relative p-2 rounded-full hover:bg-white/10 transition text-gray-300"
            onClick={onClick}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className={`${unread > 0 ? 'text-yellow-300' : 'text-gray-300'}`}
                fill="currentColor"
                aria-hidden="true"
            >
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
    );
}