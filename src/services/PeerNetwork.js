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
        this.userInfo = null; // Store user info
        this.connectedUsers = new Map(); // Store user info: peerId -> userInfo
        this.pendingUserInfoRequests = new Set(); // Track pending requests
        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;
        this.onNetworkReadyCallback = null;
        this.onMessageReceivedCallback = null;
        this.onUserInfoUpdatedCallback = null;
        this.hasAnnouncedUser = new Set();
        this.destroyed = false; // Track if peer was destroyed
        this.onGameConfigUpdatedCallback = null;
        this.onGameBoardUpdatedCallback = null;
        this.onGameStartedCallback = null;
        this.onGameOverCallback = null;
    }

    /**
     * Initialize the peer connection with user information
     * @param {Object} userInfo - User's name and color information
     * @returns {Promise<string>} The peer ID
     */
    async initialize(userInfo) {
        this.userInfo = userInfo;
        if (!this.peer || this.destroyed) {
            this.destroyed = false;
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
                    // Only try to reconnect if the peer is destroyed and it's not a "peer unavailable" error
                    if (error.type === 'peer-unavailable') {
                        console.warn('Peer unavailable:', error.message);
                    } else if (this.destroyed) {
                        this.peer.reconnect();
                    }
                    reject(error);
                });
            });
        }
        return this.peerId;
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
            
            // Request user info immediately upon connection
            this.requestUserInfo(conn.peer);
            
            // Share our user info
            conn.send({
                type: 'USER_INFO',
                userInfo: this.userInfo
            });

            // Share our known users list
            conn.send({
                type: 'KNOWN_USERS',
                users: Array.from(this.connectedUsers.entries())
            });

            // Share current game config if we have it
            if (this.currentGameConfig) {
                conn.send({
                    type: 'GAME_CONFIG',
                    config: this.currentGameConfig
                });
            }

            // Share current game state if we have it
            if (this.currentGameState) {
                conn.send({
                    type: 'GAME_STATE',
                    state: this.currentGameState
                });
            }

            this.sharePeerList(conn);
            
            if (this.onPeerConnectedCallback) {
                this.onPeerConnectedCallback(conn.peer);
            }
        });

        conn.on('data', (data) => {
            switch (data.type) {
                case 'USER_INFO':
                    this.handleUserInfo(conn.peer, data.userInfo);
                    break;
                case 'USER_INFO_REQUEST':
                    this.handleUserInfoRequest(conn.peer);
                    break;
                case 'KNOWN_USERS':
                    this.handleKnownUsers(data.users);
                    break;
                case 'PEER_LIST':
                    this.handlePeerListMessage(data.peers);
                    break;
                case 'CHAT':
                case 'SYSTEM':
                    if (this.onMessageReceivedCallback) {
                        this.onMessageReceivedCallback(data);
                    }
                    break;
                case 'GAME_CONFIG':
                    this.handleGameConfig(data.config);
                    break;
                case 'GAME_START':
                    this.handleGameStart(data.config, data.board);
                    break;
                case 'GAME_STATE':
                    this.handleGameState(data.state);
                    break;
                case 'GAME_OVER':
                    this.handleGameOver(data.reason);
                    break;
                default:
                    console.warn('Unknown message type:', data.type);
                    break;
            }
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.connectedUsers.delete(conn.peer);
            this.pendingUserInfoRequests.delete(conn.peer);
            
            if (this.onPeerDisconnectedCallback) {
                this.onPeerDisconnectedCallback(conn.peer);
            }

            const displayName = this.getUserDisplayName(conn.peer);
            this.broadcastSystemMessage(`${displayName} has left the network`);
        });
    }

    /**
     * Handle received user info
     * @private
     * @param {string} peerId - The peer ID
     * @param {Object} userInfo - The user information
     */
    handleUserInfo(peerId, userInfo) {
        this.connectedUsers.set(peerId, userInfo);
        this.pendingUserInfoRequests.delete(peerId);
        
        // Notify about new user
        if (this.onUserInfoUpdatedCallback) {
            this.onUserInfoUpdatedCallback(peerId, userInfo);
        }

        // Broadcast system message for new user
        if (!this.hasAnnouncedUser.has(peerId)) {
            this.broadcastSystemMessage(`${userInfo.name} has joined the network`);
            this.hasAnnouncedUser.add(peerId);
        }
    }

    /**
     * Handle user info request
     * @private
     * @param {string} requestingPeerId - The requesting peer's ID
     */
    handleUserInfoRequest(requestingPeerId) {
        const conn = this.connections.get(requestingPeerId);
        if (conn) {
            conn.send({
                type: 'USER_INFO',
                userInfo: this.userInfo
            });
        }
    }

    /**
     * Handle received known users list
     * @private
     * @param {Array} users - Array of [peerId, userInfo] pairs
     */
    handleKnownUsers(users) {
        users.forEach(([peerId, userInfo]) => {
            if (!this.connectedUsers.has(peerId) && peerId !== this.peerId) {
                this.connectedUsers.set(peerId, userInfo);
                if (this.onUserInfoUpdatedCallback) {
                    this.onUserInfoUpdatedCallback(peerId, userInfo);
                }
            }
        });
    }

    /**
     * Request user info from a peer
     * @private
     * @param {string} peerId - The peer to request from
     */
    requestUserInfo(peerId) {
        if (!this.connectedUsers.has(peerId) && !this.pendingUserInfoRequests.has(peerId)) {
            const conn = this.connections.get(peerId);
            if (conn) {
                conn.send({
                    type: 'USER_INFO_REQUEST'
                });
                this.pendingUserInfoRequests.add(peerId);
            }
        }
    }

    /**
     * Set callback for user info updates
     * @param {Function} callback - Called with peerId and userInfo when user info is updated
     */
    onUserInfoUpdated(callback) {
        this.onUserInfoUpdatedCallback = callback;
    }

    /**
     * Get user info for a peer
     * @param {string} peerId - The peer ID
     * @returns {Object|null} The user info or null if not found
     */
    getUserInfo(peerId) {
        return this.connectedUsers.get(peerId) || null;
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
            this.destroyed = true;
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
            senderInfo: this.userInfo,
            content,
            timestamp: Date.now()
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

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

    getUserDisplayName(peerId) {
        const userInfo = this.connectedUsers.get(peerId);
        return userInfo ? userInfo.name : 'Unknown User';
    }

    getUserColor(peerId) {
        const userInfo = this.connectedUsers.get(peerId);
        return userInfo ? userInfo.color.value : '#999';
    }

    /**
     * Handle received game configuration
     * @private
     * @param {Object} config - The game configuration
     */
    handleGameConfig(config) {
        this.currentGameConfig = config;
        if (this.onGameConfigUpdatedCallback) {
            this.onGameConfigUpdatedCallback(config);
        }
    }

    /**
     * Broadcast game configuration to all peers
     * @param {Object} config - The game configuration to broadcast
     */
    broadcastGameConfig(config) {
        this.currentGameConfig = config;
        const message = {
            type: 'GAME_CONFIG',
            config
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });
    }

    /**
     * Set callback for game configuration updates
     * @param {Function} callback - Called with new config when received
     */
    onGameConfigUpdated(callback) {
        this.onGameConfigUpdatedCallback = callback;
    }

    /**
     * Start a new game and broadcast to peers
     */
    startGame(config, board) {
        this.currentGameState = { config, board };
        const message = {
            type: 'GAME_START',
            config,
            board
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        if (this.onGameStartedCallback) {
            this.onGameStartedCallback(config, board);
        }
    }

    /**
     * Update game state and broadcast to peers
     */
    updateGameState(state) {
        this.currentGameState = state;
        const message = {
            type: 'GAME_STATE',
            state
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        if (this.onGameBoardUpdatedCallback) {
            this.onGameBoardUpdatedCallback(state);
        }
    }

    /**
     * Broadcast game over to peers
     */
    broadcastGameOver(reason) {
        const message = {
            type: 'GAME_OVER',
            reason
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        if (this.onGameOverCallback) {
            this.onGameOverCallback(reason);
        }
    }

    // Handler methods
    handleGameStart(config, board) {
        this.currentGameState = { config, board };
        if (this.onGameStartedCallback) {
            this.onGameStartedCallback(config, board);
        }
    }

    handleGameState(state) {
        this.currentGameState = state;
        if (this.onGameBoardUpdatedCallback) {
            this.onGameBoardUpdatedCallback(state);
        }
    }

    handleGameOver(reason) {
        if (this.onGameOverCallback) {
            this.onGameOverCallback(reason);
        }
    }

    // Callback setters
    onGameStarted(callback) {
        this.onGameStartedCallback = callback;
    }

    onGameBoardUpdated(callback) {
        this.onGameBoardUpdatedCallback = callback;
    }

    onGameOver(callback) {
        this.onGameOverCallback = callback;
    }
}

export default PeerNetwork; 