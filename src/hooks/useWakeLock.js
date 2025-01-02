import { useEffect, useRef } from 'react';

/**
 * Hook to request a wake lock (screen) so the device doesn't go to sleep
 * or throttle the browser tab as aggressively when in the background
 */
export function useWakeLock() {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        let isActive = true;

        async function requestWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    const wakeLock = await navigator.wakeLock.request('screen');
                    wakeLockRef.current = wakeLock;
                } catch (err) {
                    console.error('Wake Lock failed:', err);
                }
            }
        }

        requestWakeLock();

        // Re-request wake lock when visibility changes (some browsers will release it)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isActive = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
            }
        };
    }, []);
} 