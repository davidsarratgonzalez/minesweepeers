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
    const [connectedPeers, setConnectedPeers] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const [messages, setMessages] = useState([]);

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
        setMessages([]);
    }, [network]);

    return {
        peerId,
        isReady,
        connectedPeers,
        connectToPeer,
        messages,
        sendMessage,
        disconnectFromNetwork
    };
};

export default usePeerNetwork; 