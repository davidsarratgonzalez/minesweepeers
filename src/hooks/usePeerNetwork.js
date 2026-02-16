import { useState, useEffect, useCallback } from 'react';
import PeerNetwork from '../services/PeerNetwork';

/**
 * Custom hook for managing peer-to-peer network functionality in a multiplayer game environment.
 * Handles peer connections, game state synchronization, chat messaging, and cursor tracking.
 * 
 * @param {Object} config - PeerJS configuration options for network initialization
 * @returns {Object} Network state and control methods for managing the peer network
 * 
 * State management:
 * - Peer connections and user information
 * - Game configuration and state synchronization
 * - Real-time chat messaging
 * - Cursor position tracking
 * - System messages and notifications
 */
const usePeerNetwork = (config = {}) => {
    const [network] = useState(() => new PeerNetwork(config));
    const [peerId, setPeerId] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [connectedPeers, setConnectedPeers] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState(new Map());
    const [isReady, setIsReady] = useState(false);
    const [messages, setMessages] = useState([]);
    const [gameConfig, setGameConfig] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [peerCursors, setPeerCursors] = useState({});
    const [pendingActions, setPendingActions] = useState([]);

    /**
     * Initializes the peer network with user information.
     * Handles connection errors with automatic retry mechanism.
     * 
     * @param {Object} userInfo - User profile information including name and color
     */
    const initializeWithUser = useCallback(async (userInfo) => {
        try {
            const id = await network.initialize(userInfo);
            setUserInfo(userInfo);
            setPeerId(id);
            setIsReady(true);
        } catch (error) {
            console.error('Failed to initialize peer network:', error);
            // Retry initialization after 1 second on failure
            setTimeout(() => initializeWithUser(userInfo), 1000);
        }
    }, [network]);

    // Trigger initialization when user info is set but peer ID is missing
    useEffect(() => {
        if (userInfo && !peerId) {
            initializeWithUser(userInfo);
        }
    }, [userInfo, peerId, initializeWithUser]);

    /**
     * Main effect hook for setting up network event listeners and cleanup.
     * Manages peer connections, message handling, game state updates, and cursor tracking.
     */
    useEffect(() => {
        const initialize = async () => {
            try {
                const id = await network.initialize();
                setPeerId(id);
                setIsReady(true);
            } catch (error) {
                console.error('Failed to initialize peer network:', error);
            }
        };

        initialize();

        // Set up event listeners for peer network events
        network.onPeerConnected((newPeerId) => {
            setConnectedPeers(network.getConnectedPeers());
        });

        network.onPeerDisconnected((peerId) => {
            setConnectedPeers(network.getConnectedPeers());
        });

        network.onMessageReceived((message) => {
            setMessages(prev => [...prev, message]);
        });

        network.onUserInfoUpdated((peerId, userInfo) => {
            setConnectedUsers(prev => new Map(prev).set(peerId, userInfo));
        });

        network.onGameConfigUpdated((newConfig) => {
            setGameConfig(newConfig);
        });

        network.onGameStarted((config, board) => {
            setGameState({ config, board });
        });

        network.onGameBoardUpdated((state) => {
            setGameState(state);
        });

        /**
         * Handles immediate game state cleanup when game ends.
         * Clears both network and local state synchronously.
         */
        network.onGameOver(() => {
            network.currentGameState = null;
            network.currentGameConfig = null;
            network.gameConfig = null;
            
            setGameState(null);
            setGameConfig(null);
        });

        /**
         * Updates cursor positions for connected peers.
         * Removes cursor when position is null (peer disconnected/cursor hidden).
         */
        network.onCursorUpdate((peerId, position) => {
            setPeerCursors(prev => {
                if (position === null) {
                    const newCursors = { ...prev };
                    delete newCursors[peerId];
                    return newCursors;
                }
                return { ...prev, [peerId]: position };
            });
        });

        network.onCellAction((action) => {
            setPendingActions(prev => [...prev, action]);
        });

        // Cleanup function for network disconnection
        return () => {
            network.currentGameState = null;
            network.currentGameConfig = null;
            network.gameConfig = null;
            network.disconnect();
        };
    }, [network]);

    /**
     * Initiates connection to a specific peer.
     * @param {string} targetPeerId - ID of the peer to connect to
     */
    const connectToPeer = useCallback(async (targetPeerId) => {
        try {
            await network.connectToPeer(targetPeerId);
        } catch (error) {
            console.error('Failed to connect to peer:', error);
        }
    }, [network]);

    /**
     * Broadcasts a chat message to all connected peers.
     * @param {string} content - Message content to broadcast
     */
    const sendMessage = useCallback((content) => {
        network.broadcastMessage(content);
    }, [network]);

    /**
     * Disconnects from the peer network and resets all connection states.
     * Triggers reinitialization by clearing peer ID.
     */
    const disconnectFromNetwork = useCallback(async () => {
        try {
            const newPeerId = await network.disconnect();
            if (newPeerId) {
                setPeerId(newPeerId);
            } else {
                setPeerId(null);
            }
            setConnectedPeers([]);
            setConnectedUsers(new Map());
        } catch (error) {
            console.error('Error during network disconnect:', error);
            setPeerId(null);
        }
    }, [network]);

    /**
     * Updates and broadcasts game configuration to all peers.
     * @param {Object} newConfig - New game configuration settings
     */
    const updateGameConfig = useCallback((newConfig) => {
        network.broadcastGameConfig(newConfig);
        setGameConfig(newConfig);
    }, [network]);

    /**
     * Initiates a new game with specified configuration and board state.
     * @param {Object} config - Game configuration
     * @param {Array} board - Initial game board state
     */
    const startGame = useCallback((config, board) => {
        network.startGame(config, board);
    }, [network]);

    /**
     * Updates and synchronizes game state across all peers.
     * @param {Object} state - Current game state to broadcast
     */
    const updateGameState = useCallback((state) => {
        network.updateGameState(state);
    }, [network]);

    /**
     * Ends the current game and cleans up game state.
     * @param {string|null} reason - Optional reason for game end
     * @param {boolean} propagate - Whether to broadcast game over to peers
     */
    const endGame = useCallback((reason = null, propagate = true) => {
        network.currentGameState = null;
        network.currentGameConfig = null;
        network.gameConfig = null;
        
        setGameState(null);
        setGameConfig(null);
        
        if (propagate) {
            network.broadcastGameOver(reason);
        }
    }, [network]);

    /**
     * Broadcasts cursor position to all connected peers.
     * @param {Object} position - Cursor position coordinates
     */
    const broadcastCursorPosition = useCallback((position) => {
        network.broadcastCursorPosition(position);
    }, [network]);

    /**
     * Adds a system message to the chat.
     * @param {string} content - System message content
     */
    const addSystemMessage = useCallback((content) => {
        network.addSystemMessage(content);
    }, [network]);

    const broadcastCellAction = useCallback((action) => {
        network.broadcastCellAction(action);
    }, [network]);

    const clearPendingActions = useCallback(() => {
        setPendingActions([]);
    }, []);

    const syncBoard = useCallback((boardBlueprint) => {
        network.setCurrentBoard(boardBlueprint);
    }, [network]);

    return {
        peerId,
        isReady,
        userInfo,
        connectedPeers,
        connectedUsers,
        connectToPeer,
        messages,
        sendMessage,
        disconnectFromNetwork,
        initializeWithUser,
        gameConfig,
        updateGameConfig,
        gameState,
        startGame,
        updateGameState,
        endGame,
        peerCursors,
        broadcastCursorPosition,
        addSystemMessage,
        pendingActions,
        broadcastCellAction,
        clearPendingActions,
        syncBoard,
    };
};

export default usePeerNetwork;