import { useEffect, useRef } from 'react';

/**
 * Custom React hook that manages the Wake Lock API to prevent browser throttling and screen sleep.
 * 
 * Critical for maintaining stable peer-to-peer connections, as browsers may throttle or suspend
 * background tabs/processes, which can disrupt WebRTC connections and data synchronization.
 * 
 * @returns {void}
 * 
 * @example
 * function NetworkComponent() {
 *   useWakeLock(); // Maintains active connection state
 *   return <div>Connected Peers: ...</div>;
 * }
 */
export function useWakeLock() {
    // Maintains reference to active wake lock between renders
    const wakeLockRef = useRef(null);

    useEffect(() => {
        // Flag to track if the effect is still mounted
        let isActive = true;

        /**
         * Requests a wake lock from the browser's Wake Lock API.
         * Essential for maintaining consistent peer network connectivity by preventing
         * the browser from aggressively throttling background processes.
         * 
         * @async
         * @function
         * @returns {Promise<void>}
         */
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

        /**
         * Handles visibility changes in the document.
         * Critical for peer connections as browsers may release wake lock and throttle
         * background tabs, potentially disrupting WebRTC connections. Re-requests
         * wake lock when tab becomes visible to maintain connection stability.
         */
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        /**
         * Cleanup function that:
         * 1. Marks the effect as inactive
         * 2. Removes visibility change listener
         * 3. Releases any active wake lock
         * 
         * @returns {void}
         */
        return () => {
            isActive = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
            }
        };
    }, []);
}