import Peer from 'peerjs';
import { createBoardBlueprint } from '../utils/minesweeperLogic';

/**
 * Represents a chat or system message in the network
 * @typedef {Object} ChatMessage
 * @property {string} type - Message type (CHAT or SYSTEM)
 * @property {string} sender - Sender's peer ID
 * @property {string} content - Message content
 * @property {number} timestamp - Message timestamp in milliseconds
 */

/**
 * Represents a disconnect notification message
 * @typedef {Object} DisconnectMessage
 * @property {string} type - Always 'DISCONNECT'
 * @property {string} peerId - ID of disconnecting peer
 * @property {string} reason - Reason for disconnection (e.g., 'manual', 'error')
 */

/**
 * Manages peer-to-peer connections and network topology for multiplayer functionality.
 * Handles peer discovery, message broadcasting, game state synchronization and cursor tracking.
 * @class PeerNetwork
 */
class PeerNetwork {
    /**
     * Creates a new PeerNetwork instance
     * @param {Object} config - PeerJS configuration options for customizing the peer connection
     */
    constructor(config = {}) {
        // Core networking
        this.peer = null;
        this.peerId = null;
        this.config = config;
        this.destroyed = false;
        this.connections = new Map(); // Active peer connections mapped by peerId
        this.outgoingConnections = new Set(); // Tracks connections initiated by this peer
        
        // User management
        this.userInfo = null;
        this.connectedUsers = new Map(); // User info mapped by peerId
        this.pendingUserInfoRequests = new Set();
        this.hasAnnouncedUser = new Set();
        
        // Messaging
        this.messages = [];
        
        // Cursor tracking
        this.cursorTimestamps = new Map();
        this.cursorCleanupInterval = null;
        this.CURSOR_TIMEOUT = 7000;
        
        // Game state
        this.currentGameConfig = null;
        this.currentGameState = null;
        this.gameConfig = null;

        // Callback handlers
        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;
        this.onNetworkReadyCallback = null;
        this.onMessageReceivedCallback = null;
        this.onUserInfoUpdatedCallback = null;
        this.onGameConfigUpdatedCallback = null;
        this.onGameBoardUpdatedCallback = null;
        this.onGameStartedCallback = null;
        this.onGameOverCallback = null;
        this.onCursorUpdateCallback = null;
    }

    /**
     * Initializes the peer connection and sets up the network
     * @param {Object} userInfo - Information about the local user (name, color, etc)
     * @returns {Promise<string>} Resolves with the assigned peer ID
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
                    // Only try to reconnect if the peer is destroyed and it's not a "peer-unavailable" error
                    if (error.type === 'peer-unavailable') {
                        console.warn('Peer unavailable:', error.message);
                    } else if (this.destroyed) {
                        // Attempt a reconnection if this was a temporary issue
                        this.peer.reconnect();
                    }
                    reject(error);
                });
            });
        }
        return this.peerId;
    }

    /**
     * Sets up event listeners for handling incoming peer connections
     * @private
     */
    setupEventListeners() {
        this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
        });
    }

    /**
     * Handles new incoming peer connections by setting up data handlers and sharing network state
     * @private
     * @param {DataConnection} conn - The peer connection object
     */
    handleIncomingConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            
            // Share user info
            if (this.userInfo) {
                conn.send({
                    type: 'USER_INFO',
                    peerId: this.peerId,
                    userInfo: this.userInfo
                });
            }

            // Only share game config if we're being connected to (we're the "host")
            if (!this.outgoingConnections.has(conn.peer)) {
                if (this.currentGameConfig && !this.currentGameState) {
                    conn.send({
                        type: 'GAME_CONFIG',
                        config: this.currentGameConfig
                    });
                }

                // Share current game state if we're in an active game
                if (this.currentGameState?.board) {
                    // Calculate remaining time
                    const currentTimer = this.currentGameState.config.timer;
                    const totalSeconds = currentTimer.minutes * 60 + currentTimer.seconds;
                    const elapsedSeconds = Math.floor((Date.now() - this.currentGameState.startTime) / 1000);
                    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

                    // Create a new state object with updated timer
                    const stateToSend = {
                        ...this.currentGameState,
                        config: {
                            ...this.currentGameState.config,
                            timer: {
                                ...currentTimer,
                                minutes: Math.floor(remainingSeconds / 60),
                                seconds: remainingSeconds % 60,
                                enabled: currentTimer.enabled
                            }
                        }
                    };

                    conn.send({
                        type: 'GAME_STATE',
                        state: stateToSend
                    });
                }
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
                case 'CURSOR_UPDATE':
                    this.handleCursorUpdate(conn.peer, data.position);
                    break;
                case 'DISCONNECT':
                    this.handlePeerDisconnectMessage(data.peerId, data.reason);
                    break;
                default:
                    console.warn('Unknown message type:', data.type);
                    break;
            }
        });

        conn.on('close', () => {
            const userInfo = this.connectedUsers.get(conn.peer);
            this.connections.delete(conn.peer);
            this.outgoingConnections.delete(conn.peer);
            this.connectedUsers.delete(conn.peer);
            this.pendingUserInfoRequests.delete(conn.peer);
            
            if (userInfo && this.onMessageReceivedCallback) {
                // Inform about the disconnection
                const message = {
                    type: 'SYSTEM',
                    content: `${userInfo.name} left!`,
                    timestamp: Date.now(),
                    peerId: conn.peer
                };
                this.onMessageReceivedCallback(message);
            }

            if (this.onPeerDisconnectedCallback) {
                this.onPeerDisconnectedCallback(conn.peer);
            }
        });
    }

    /**
     * Determines if a new connection should be established with a peer
     * @private
     * @param {string} peerId - The potential peer's ID
     * @returns {boolean} True if connection should be attempted, false otherwise
     */
    shouldConnectToPeer(peerId) {
        // Avoid connecting to self
        if (peerId === this.peerId) return false;
        // Avoid connecting if we already have them in connections
        if (this.connections.has(peerId)) return false;
        // Avoid connecting if we already have an outgoing connection to them
        if (this.outgoingConnections.has(peerId)) return false;
        return true;
    }

    /**
     * Processes received peer list and establishes connections with new peers
     * @private
     * @param {string[]} peers - Array of peer IDs to potentially connect with
     */
    async handlePeerListMessage(peers) {
        for (const peerId of peers) {
            if (this.shouldConnectToPeer(peerId)) {
                await this.connectToPeer(peerId);
            }
        }
    }

    /**
     * Updates local user info storage and triggers relevant callbacks
     * @private
     * @param {string} peerId - The peer's ID
     * @param {Object} userInfo - The user's information (name, color, etc)
     */
    handleUserInfo(peerId, userInfo) {
        this.connectedUsers.set(peerId, userInfo);
        this.pendingUserInfoRequests.delete(peerId);
        
        // Notify about new user
        if (this.onUserInfoUpdatedCallback) {
            this.onUserInfoUpdatedCallback(peerId, userInfo);
        }

        // Broadcast system message for new user only once
        if (!this.hasAnnouncedUser.has(peerId)) {
            this.hasAnnouncedUser.add(peerId);
        }
    }

    /**
     * Responds to user info requests by sending local user information
     * @private
     * @param {string} requestingPeerId - ID of the peer requesting user info
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
     * Updates local user info storage with information about multiple users
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
     * Requests user information from a specific peer
     * @private
     * @param {string} peerId - ID of the peer to request info from
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
     * Sets callback for user info updates
     * @param {Function} callback - Function called when user info changes
     */
    onUserInfoUpdated(callback) {
        this.onUserInfoUpdatedCallback = callback;
    }

    /**
     * Retrieves user information for a specific peer
     * @param {string} peerId - The peer's ID
     * @returns {Object|null} User info object or null if not found
     */
    getUserInfo(peerId) {
        return this.connectedUsers.get(peerId) || null;
    }

    /**
     * Establishes a connection with a new peer
     * @param {string} targetPeerId - ID of the peer to connect to
     * @returns {Promise<DataConnection>} Promise resolving to the connection object
     */
    async connectToPeer(targetPeerId) {
        try {
            const conn = this.peer.connect(targetPeerId);
            this.outgoingConnections.add(conn.peer);
            this.handleIncomingConnection(conn);
            return conn;
        } catch (error) {
            console.error('Failed to connect to peer:', error);
            throw error;
        }
    }

    /**
     * Shares list of connected peers with a newly connected peer
     * @private
     * @param {DataConnection} conn - Connection to share peer list with
     */
    sharePeerList(conn) {
        const peerList = Array.from(this.connections.keys());
        conn.send({
            type: 'PEER_LIST',
            peers: peerList
        });
    }

    /**
     * Sets callback for peer connection events
     * @param {Function} callback - Function called when a new peer connects
     */
    onPeerConnected(callback) {
        this.onPeerConnectedCallback = callback;
    }

    /**
     * Sets callback for peer disconnection events
     * @param {Function} callback - Function called when a peer disconnects
     */
    onPeerDisconnected(callback) {
        this.onPeerDisconnectedCallback = callback;
    }

    /**
     * Sets callback for network initialization
     * @param {Function} callback - Function called when network is ready
     */
    onNetworkReady(callback) {
        this.onNetworkReadyCallback = callback;
    }

    /**
     * Gets array of currently connected peer IDs
     * @returns {string[]} Array of peer IDs
     */
    getConnectedPeers() {
        return Array.from(this.connections.keys());
    }

    /**
     * Disconnects from current peers while maintaining ability to reconnect
     * Ensures clean disconnection and proper state cleanup
     * @param {string} [reason='manual'] - Reason for disconnection
     * @param {boolean} [destroyPeer=false] - Whether to completely destroy the peer connection
     */
    disconnect(reason = 'manual', destroyPeer = false) {
        if (!this.peer) return;

        // First notify all peers that we're disconnecting
        const disconnectMessage = {
            type: 'DISCONNECT',
            peerId: this.peerId,
            reason
        };

        // Broadcast disconnect message to all peers
        this.connections.forEach(conn => {
            try {
                conn.send(disconnectMessage);
            } catch (error) {
                console.warn('Failed to send disconnect message to peer:', error);
            }
        });

        // Small delay to allow messages to be sent before closing connections
        setTimeout(() => {
            // Close all peer connections
            this.connections.forEach(conn => {
                try {
                    conn.close();
                } catch (error) {
                    console.warn('Error closing connection:', error);
                }
            });

            // Clear all connection tracking
            this.connections.clear();
            this.outgoingConnections.clear();
            this.connectedUsers.clear();
            this.pendingUserInfoRequests.clear();
            this.hasAnnouncedUser.clear();
            this.cursorTimestamps.clear();

            // Stop cursor cleanup interval
            if (this.cursorCleanupInterval) {
                clearInterval(this.cursorCleanupInterval);
                this.cursorCleanupInterval = null;
            }

            // Clear game state
            this.currentGameState = null;
            this.currentGameConfig = null;
            this.gameConfig = null;

            // Only destroy peer if explicitly requested
            if (destroyPeer) {
                this.peer.destroy();
                this.peer = null;
                this.destroyed = true;
                this.peerId = null;
            }
        }, 100); // Small delay to ensure messages are sent
    }

    /**
     * Broadcasts a chat message to all connected peers
     * @param {string} content - The message content
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
     * Sets callback for message reception
     * @param {Function} callback - Function called when messages are received
     */
    onMessageReceived(callback) {
        this.onMessageReceivedCallback = callback;
    }

    /**
     * Broadcasts a system message to all peers
     * @private
     * @param {string} content - The system message content
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

    /**
     * Gets display name for a peer
     * @param {string} peerId - The peer's ID
     * @returns {string} Display name or "Unknown player" if not found
     */
    getUserDisplayName(peerId) {
        const userInfo = this.connectedUsers.get(peerId);
        return userInfo ? userInfo.name : 'Unknown player';
    }

    /**
     * Gets color associated with a peer
     * @param {string} peerId - The peer's ID
     * @returns {string} Color value or default color if not found
     */
    getUserColor(peerId) {
        const userInfo = this.connectedUsers.get(peerId);
        return userInfo ? userInfo.color.value : '#999';
    }

    /**
     * Updates game configuration based on received data
     * @private
     * @param {Object} config - The new game configuration
     */
    handleGameConfig(config) {
        // Guard for null or undefined config
        if (!config) {
            console.warn('handleGameConfig received null or undefined config. Ignoring.');
            return;
        }

        if (this.currentGameState?.board) {
            // If we're in a game, update the timer in the config
            config = {
                ...config,
                timer: this.getCurrentTimerState(config)
            };
        }
        
        this.currentGameConfig = config;
        if (this.onGameConfigUpdatedCallback) {
            this.onGameConfigUpdatedCallback(config);
        }
    }

    /**
     * Broadcasts game configuration to all connected peers
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
     * Sets callback for game configuration updates
     * @param {Function} callback - Function called when game config changes
     */
    onGameConfigUpdated(callback) {
        this.onGameConfigUpdatedCallback = callback;
    }

    /**
     * Starts a new game and broadcasts initial state to all peers
     * @param {Object} config - Initial game configuration
     * @param {Object} board - Initial board state
     */
    startGame(config, board) {
        // Clear any existing game state first
        this.currentGameState = null;
        this.currentGameConfig = null;
        
        // Set new game state
        this.currentGameState = { 
            config, 
            board,
            startTime: Date.now()
        };

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
     * Updates game state and broadcasts changes to all peers
     * @param {Object} state - New game state with updated board
     */
    updateGameState(state) {
        if (!this.currentGameState) return;

        this.currentGameState = {
            ...this.currentGameState,
            board: state.board
        };

        const message = {
            type: 'GAME_STATE',
            state: this.currentGameState
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        if (this.onGameBoardUpdatedCallback) {
            this.onGameBoardUpdatedCallback(this.currentGameState);
        }
    }

    /**
     * Broadcasts game over state to all peers
     * @param {string|null} reason - Reason for game ending
     */
    broadcastGameOver(reason) {
        this.currentGameState = null;
        this.currentGameConfig = null;
        this.gameConfig = null;

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

    /**
     * Handles game start messages from peers
     * @private
     * @param {Object} config - Game configuration
     * @param {Object} board - Initial board state
     */
    handleGameStart(config, board) {
        this.currentGameState = { config, board };
        if (this.onGameStartedCallback) {
            this.onGameStartedCallback(config, board);
        }
    }

    /**
     * Handles game state updates from peers
     * @private
     * @param {Object} state - Updated game state
     */
    handleGameState(state) {
        this.currentGameState = state;
        if (this.onGameBoardUpdatedCallback) {
            this.onGameBoardUpdatedCallback(state);
        }
    }

    /**
     * Handles game over messages from peers
     * @private
     * @param {string} reason - Reason for game ending
     */
    handleGameOver(reason) {
        this.currentGameState = null;
        this.currentGameConfig = null;
        this.gameConfig = null;

        if (this.onGameOverCallback) {
            this.onGameOverCallback(reason);
        }
    }

    /**
     * Sets callback for game start events
     * @param {Function} callback - Function called when game starts
     */
    onGameStarted(callback) {
        this.onGameStartedCallback = callback;
    }

    /**
     * Sets callback for game board updates
     * @param {Function} callback - Function called when board changes
     */
    onGameBoardUpdated(callback) {
        this.onGameBoardUpdatedCallback = callback;
    }

    /**
     * Sets callback for game over events
     * @param {Function} callback - Function called when game ends
     */
    onGameOver(callback) {
        this.onGameOverCallback = callback;
    }

    /**
     * Broadcasts cursor position to all connected peers
     * @param {Object} position - Cursor position {x, y, isInCanvas}
     */
    broadcastCursorPosition(position) {
        if (!position) return;

        const message = {
            type: 'CURSOR_UPDATE',
            position,
            timestamp: Date.now()
        };

        this.connections.forEach(conn => {
            conn.send(message);
        });

        this.cursorTimestamps.set(this.peerId, Date.now());
        if (!this.cursorCleanupInterval) {
            this.startCursorCleanup();
        }
    }

    /**
     * Handles cursor updates from peers
     * @private
     * @param {string} peerId - ID of peer whose cursor moved
     * @param {Object} position - New cursor position
     */
    handleCursorUpdate(peerId, position) {
        if (position) {
            this.cursorTimestamps.set(peerId, Date.now());
            if (!this.cursorCleanupInterval) {
                this.startCursorCleanup();
            }
        } else {
            this.cursorTimestamps.delete(peerId);
        }

        if (this.onCursorUpdateCallback) {
            this.onCursorUpdateCallback(peerId, position);
        }
    }

    /**
     * Sets callback for cursor update events
     * @param {Function} callback - Function called when cursors move
     */
    onCursorUpdate(callback) {
        this.onCursorUpdateCallback = callback;
    }

    /**
     * Handles peer disconnection cleanup
     * @private
     * @param {string} peerId - ID of disconnected peer
     */
    handlePeerDisconnected(peerId) {
        if (this.onCursorUpdateCallback) {
            // Send null to remove cursor
            this.onCursorUpdateCallback(peerId, null);
        }
        this.cursorTimestamps.delete(peerId);
        if (this.cursorTimestamps.size === 0) {
            this.stopCursorCleanup();
        }
    }

    /**
     * Adds a system message to the message list
     * @param {string} content - System message content
     */
    addSystemMessage(content) {
        const message = {
            type: 'SYSTEM',
            content,
            timestamp: Date.now()
        };
        this.messages.push(message);
        if (this.onMessageReceivedCallback) {
            this.onMessageReceivedCallback(message);
        }
    }

    /**
     * Gets current timer state from game state
     * @private
     * @param {Object} config - Game configuration
     * @returns {Object} Current timer state
     */
    getCurrentTimerState(config) {
        if (!config || !config.timer) {
            // Provide a fallback timer object if null
            return {
                enabled: false,
                minutes: 0,
                seconds: 0
            };
        }
        if (this.currentGameState?.getCurrentTimerState) {
            return this.currentGameState.getCurrentTimerState();
        }
        return config.timer;
    }

    /**
     * Starts interval to clean up stale cursor positions
     * @private
     */
    startCursorCleanup() {
        if (this.cursorCleanupInterval) {
            clearInterval(this.cursorCleanupInterval);
        }
        this.cursorCleanupInterval = setInterval(() => {
            const now = Date.now();
            let hasRemovals = false;

            this.cursorTimestamps.forEach((timestamp, peerId) => {
                if (now - timestamp > this.CURSOR_TIMEOUT) {
                    this.cursorTimestamps.delete(peerId);
                    if (this.onCursorUpdateCallback) {
                        this.onCursorUpdateCallback(peerId, null);
                    }
                    hasRemovals = true;
                }
            });
            if (hasRemovals && this.cursorTimestamps.size === 0) {
                this.stopCursorCleanup();
            }
        }, 1000);
    }

    /**
     * Stops the cursor cleanup interval
     * @private
     */
    stopCursorCleanup() {
        if (this.cursorCleanupInterval) {
            clearInterval(this.cursorCleanupInterval);
            this.cursorCleanupInterval = null;
        }
    }

    /**
     * Handles disconnect messages from peers
     * Ensures proper cleanup of peer state and UI updates
     * @private
     * @param {string} peerId - ID of disconnecting peer
     * @param {string} reason - Reason for disconnection
     */
    handlePeerDisconnectMessage(peerId, reason) {
        // Get user info before removing from map
        const userInfo = this.connectedUsers.get(peerId);

        // Clean up peer state
        this.connections.delete(peerId);
        this.outgoingConnections.delete(peerId);
        this.connectedUsers.delete(peerId);
        this.pendingUserInfoRequests.delete(peerId);
        this.hasAnnouncedUser.delete(peerId);

        // Handle cursor cleanup
        this.handlePeerDisconnected(peerId);

        // Notify about disconnection if we have user info
        if (userInfo && this.onMessageReceivedCallback) {
            const message = {
                type: 'SYSTEM',
                content: `${userInfo.name} left!`,
                timestamp: Date.now(),
                peerId
            };
            this.onMessageReceivedCallback(message);
        }

        // Trigger disconnect callback
        if (this.onPeerDisconnectedCallback) {
            this.onPeerDisconnectedCallback(peerId);
        }
    }
}

export default PeerNetwork;