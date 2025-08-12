import React from "react";

export function useServiceWorkerRegistration() {
    React.useEffect(() => {
        let cancelled = false;

        async function registerSW() {
            try {
                if (!('serviceWorker' in navigator)) return;

                // Avoid duplicate registration
                const existing = await navigator.serviceWorker.getRegistration('/');
                if (existing) return;

                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                if (cancelled) return;

                // Optional lifecycle wiring
                reg.addEventListener?.('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // window.location.reload();
                        }
                    });
                });

                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    // SW took control of the page
                });
            } catch (err) {
                console.error('SW register error', err);
            }
        }

        registerSW();
        return () => {
            cancelled = true;
        };
    }, []);
}