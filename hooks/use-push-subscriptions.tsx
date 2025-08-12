import React from "react";
import { SubsResponse } from "@/utils/types";
export function usePushSubscriptions() {
    const [subscriptions, setSubscriptions] = React.useState<unknown[]>([]);
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

    return {
        subscriptions,
        isSubscribed: subscriptions.length > 0,
        reload: loadSubscriptions,
    };
}
