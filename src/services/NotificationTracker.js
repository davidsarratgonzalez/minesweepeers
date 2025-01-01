/**
 * Tracks peer notifications to prevent duplicate join/leave messages
 */
class NotificationTracker {
    constructor() {
        this.notifiedPeers = new Set();
    }

    /**
     * Check if we should notify about a peer joining
     * @param {string} peerId - The peer's ID
     * @returns {boolean} - True if we should notify, false if already notified
     */
    shouldNotifyJoin(peerId) {
        if (this.notifiedPeers.has(peerId)) {
            return false;
        }
        this.notifiedPeers.add(peerId);
        return true;
    }

    /**
     * Check if we should notify about a peer leaving
     * @param {string} peerId - The peer's ID
     * @returns {boolean} - True if we should notify, false if not registered
     */
    shouldNotifyLeave(peerId) {
        if (!this.notifiedPeers.has(peerId)) {
            return false;
        }
        this.notifiedPeers.delete(peerId);
        return true;
    }

    /**
     * Clear all tracked notifications
     */
    reset() {
        this.notifiedPeers.clear();
    }
}

export default NotificationTracker; 