/**
 * Manages peer notification state tracking to prevent duplicate notifications in a peer-to-peer network.
 * Maintains a registry of peers that have already triggered join/leave notifications to ensure
 * each peer event is only notified once.
 * 
 * Key features:
 * - Tracks peer notification states using a Set data structure for O(1) lookups
 * - Prevents duplicate join notifications for already registered peers
 * - Ensures leave notifications only trigger for previously registered peers
 * - Provides state reset capability for cleanup
 */
class NotificationTracker {
    /**
     * Initializes a new NotificationTracker instance.
     * Creates an empty Set to track peers that have triggered notifications.
     */
    constructor() {
        this.notifiedPeers = new Set();
    }

    /**
     * Determines if a join notification should be triggered for a peer.
     * Automatically registers the peer if notification should occur.
     * 
     * @param {string} peerId - Unique identifier of the peer attempting to join
     * @returns {boolean} True if this is the first join attempt for this peer,
     *                    false if the peer has already been registered
     */
    shouldNotifyJoin(peerId) {
        if (this.notifiedPeers.has(peerId)) {
            return false;
        }
        this.notifiedPeers.add(peerId);
        return true;
    }

    /**
     * Determines if a leave notification should be triggered for a peer.
     * Automatically removes the peer from tracking if notification occurs.
     * 
     * @param {string} peerId - Unique identifier of the peer attempting to leave
     * @returns {boolean} True if the peer was previously registered and should trigger
     *                    a leave notification, false if peer was not registered
     */
    shouldNotifyLeave(peerId) {
        if (!this.notifiedPeers.has(peerId)) {
            return false;
        }
        this.notifiedPeers.delete(peerId);
        return true;
    }

    /**
     * Resets the notification tracker to its initial state.
     * Clears all tracked peer notifications, useful for cleanup or reset scenarios.
     * Should be called when needing to reset all peer notification states.
     */
    reset() {
        this.notifiedPeers.clear();
    }
}

export default NotificationTracker;