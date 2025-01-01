import Peer from 'peerjs';

/**
 * @typedef {Object} ChatMessage
 * @property {string} type - Message type (CHAT or SYSTEM)
 * @property {string} sender - Sender's peer ID
 * @property {string} content - Message content
 * @property {number} timestamp - Message timestamp
 */

/**
 * PeerNetwork manages peer-to-peer connections and network topology
 * @class PeerNetwork
 */
class PeerNetwork {
    /**
     * Initialize PeerNetwork with optional configuration
     * @param {Object} config - PeerJS configuration options
     */
    constructor(config = {}) {
        this.peer = null;
        this.connections = new Map(); // Stores active connections
        this.peerId = null;
        this.config = config;
        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;
        this.onNetworkReadyCallback = null;
        this.onMessageReceivedCallback = null;
    }

    /**
     * Initialize the peer connection
     * @returns {Promise<string>} The peer ID
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.peer = new Peer(this.config);

            this.peer.on('open', (id) => {
                this.peerId = id;
                this.setupEventListeners();
                if (this.onNetworkReadyCallback) {
                    this.onNetworkReadyCallback(id);
                }
                resolve(id);
            });

            this.peer.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Set up event listeners for peer connections
     * @private
     */
    setupEventListeners() {
        this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
        });
    }

    /**
     * Handle incoming peer connections
     * @private
     * @param {DataConnection} conn - The peer connection
     */
    handleIncomingConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.sharePeerList(conn);
            
            if (this.onPeerConnectedCallback) {
                this.onPeerConnectedCallback(conn.peer);
            }
            
            // Broadcast system message about new peer
            this.broadcastSystemMessage(`Peer ${conn.peer} has joined the network`);
        });

        conn.on('data', (data) => {
            this.handlePeerMessage(conn.peer, data);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            if (this.onPeerDisconnectedCallback) {
                this.onPeerDisconnectedCallback(conn.peer);
            }
            
            // Broadcast system message about peer disconnection
            this.broadcastSystemMessage(`Peer ${conn.peer} has left the network`);
        });
    }

    /**
     * Connect to a peer using their ID
     * @param {string} peerId - The ID of the peer to connect to
     * @returns {Promise<void>}
     */
    async connectToPeer(peerId) {
        if (peerId === this.peerId || this.connections.has(peerId)) {
            return;
        }

        const conn = this.peer.connect(peerId);
        this.handleIncomingConnection(conn);
    }

    /**
     * Share the list of connected peers with a new peer
     * @private
     * @param {DataConnection} conn - The peer connection
     */
    sharePeerList(conn) {
        const peerList = Array.from(this.connections.keys());
        conn.send({
            type: 'PEER_LIST',
            peers: peerList
        });
    }

    /**
     * Handle incoming messages from peers
     * @private
     * @param {string} peerId - The ID of the sending peer
     * @param {Object} message - The received message
     */
    handlePeerMessage(peerId, message) {
        if (message.type === 'PEER_LIST') {
            this.handlePeerListMessage(message.peers);
        } else if (message.type === 'CHAT' || message.type === 'SYSTEM') {
            if (this.onMessageReceivedCallback) {
                this.onMessageReceivedCallback(message);
            }
        }
    }

    /**
     * Handle received peer list and establish missing connections
     * @private
     * @param {string[]} peers - List of peer IDs
     */
    async handlePeerListMessage(peers) {
        for (const peerId of peers) {
            await this.connectToPeer(peerId);
        }
    }

    /**
     * Set callback for when a peer connects
     * @param {Function} callback - Called with peer ID when a new peer connects
     */
    onPeerConnected(callback) {
        this.onPeerConnectedCallback = callback;
    }

    /**
     * Set callback for when a peer disconnects
     * @param {Function} callback - Called with peer ID when a peer disconnects
     */
    onPeerDisconnected(callback) {
        this.onPeerDisconnectedCallback = callback;
    }

    /**
     * Set callback for when the network is ready
     * @param {Function} callback - Called with peer ID when network is initialized
     */
    onNetworkReady(callback) {
        this.onNetworkReadyCallback = callback;
    }

    /**
     * Get the list of connected peers
     * @returns {string[]} Array of connected peer IDs
     */
    getConnectedPeers() {
        return Array.from(this.connections.keys());
    }

    /**
     * Disconnect from the network
     */
    disconnect() {
        this.connections.forEach((conn) => conn.close());
        this.connections.clear();
        if (this.peer) {
            this.peer.destroy();
        }
    }

    /**
     * Send a chat message to all connected peers
     * @param {string} content - Message content
     */
    broadcastMessage(content) {
        const message = {
            type: 'CHAT',
            sender: this.peerId,
            content,
            timestamp: Date.now()
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        // Also notify local listeners
        if (this.onMessageReceivedCallback) {
            this.onMessageReceivedCallback(message);
        }
    }

    /**
     * Set callback for receiving messages
     * @param {Function} callback - Called with message object when a message is received
     */
    onMessageReceived(callback) {
        this.onMessageReceivedCallback = callback;
    }

    /**
     * Send system notification to all peers
     * @private
     * @param {string} content - System message content
     */
    broadcastSystemMessage(content) {
        const message = {
            type: 'SYSTEM',
            sender: 'SYSTEM',
            content,
            timestamp: Date.now()
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        // Also notify local listeners
        if (this.onMessageReceivedCallback) {
            this.onMessageReceivedCallback(message);
        }
    }
}

export default PeerNetwork; 