import { useState, useEffect, useCallback } from 'react';
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

        return () => {
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
        initializeWithUser
    };
};

export default usePeerNetwork; 