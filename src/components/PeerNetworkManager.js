import React, { useState } from 'react';
import usePeerNetwork from '../hooks/usePeerNetwork';
import ChatRoom from './ChatRoom';
import './PeerNetworkManager.css';

/**
 * Component for managing peer network connections and chat
 */
const PeerNetworkManager = () => {
    const [targetPeerId, setTargetPeerId] = useState('');
    const { 
        peerId, 
        isReady, 
        connectedPeers, 
        connectToPeer,
        messages,
        sendMessage
    } = usePeerNetwork();

    const handleConnect = (e) => {
        e.preventDefault();
        if (targetPeerId.trim()) {
            connectToPeer(targetPeerId.trim());
            setTargetPeerId('');
        }
    };

    return (
        <div className="peer-network-manager">
            <div className="network-info">
                <h2>Peer Network</h2>
                <div className="status-container">
                    <p>Your Peer ID: <span className="peer-id">{peerId || 'Initializing...'}</span></p>
                    <p>Status: <span className={`status ${isReady ? 'ready' : ''}`}>
                        {isReady ? 'Ready' : 'Initializing...'}
                    </span></p>
                </div>

                <form className="connect-form" onSubmit={handleConnect}>
                    <input
                        type="text"
                        value={targetPeerId}
                        onChange={(e) => setTargetPeerId(e.target.value)}
                        placeholder="Enter peer ID to connect"
                    />
                    <button type="submit" disabled={!isReady}>
                        Connect to Peer
                    </button>
                </form>

                <div className="peers-list">
                    <h3>Connected Peers ({connectedPeers.length})</h3>
                    <ul>
                        {connectedPeers.map((peer) => (
                            <li key={peer}>{peer}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <ChatRoom messages={messages} sendMessage={sendMessage} />
        </div>
    );
};

export default PeerNetworkManager; 