import { useState, useEffect, useCallback, useRef } from 'react';
import PeerNetwork from '../services/PeerNetwork';

/**
 * Hook for managing peer-to-peer network connections and chat
 * @param {Object} config - PeerJS configuration options
 * @returns {Object} Network state and control methods
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

    const initializeWithUser = useCallback(async (userInfo) => {
        try {
            const id = await network.initialize(userInfo);
            setUserInfo(userInfo);
            setPeerId(id);
            setIsReady(true);
        } catch (error) {
            console.error('Failed to initialize peer network:', error);
            // Try to reinitialize on error
            setTimeout(() => initializeWithUser(userInfo), 1000);
        }
    }, [network]);

    useEffect(() => {
        if (userInfo && !peerId) {
            initializeWithUser(userInfo);
        }
    }, [userInfo, peerId, initializeWithUser]);

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

        network.onGameOver(() => {
            // Clear ALL state IMMEDIATELY without any timeouts
            network.currentGameState = null;
            network.currentGameConfig = null;
            network.gameConfig = null;
            
            // Clear local state IMMEDIATELY
            setGameState(null);
            setGameConfig(null);
        });

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

        return () => {
            // Clean up IMMEDIATELY on unmount
            network.currentGameState = null;
            network.currentGameConfig = null;
            network.gameConfig = null;
            network.disconnect();
        };
    }, [network]);

    const connectToPeer = useCallback(async (targetPeerId) => {
        try {
            await network.connectToPeer(targetPeerId);
        } catch (error) {
            console.error('Failed to connect to peer:', error);
        }
    }, [network]);

    const sendMessage = useCallback((content) => {
        network.broadcastMessage(content);
    }, [network]);

    const disconnectFromNetwork = useCallback(() => {
        network.disconnect();
        setConnectedPeers([]);
        setConnectedUsers(new Map());
        setPeerId(null); // Clear peer ID to trigger reinitialization
    }, [network]);

    const updateGameConfig = useCallback((newConfig) => {
        network.broadcastGameConfig(newConfig);
        setGameConfig(newConfig);
    }, [network]);

    const startGame = useCallback((config, board) => {
        network.startGame(config, board);
    }, [network]);

    const updateGameState = useCallback((state) => {
        network.updateGameState(state);
    }, [network]);

    const endGame = useCallback((reason = null, propagate = true) => {
        // Clear ALL state IMMEDIATELY
        network.currentGameState = null;
        network.currentGameConfig = null;
        network.gameConfig = null;
        
        setGameState(null);
        setGameConfig(null);
        
        if (propagate) {
            network.broadcastGameOver(reason);
        }
    }, [network]);

    const broadcastCursorPosition = useCallback((position) => {
        network.broadcastCursorPosition(position);
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
        broadcastCursorPosition
    };
};

export default usePeerNetwork; 