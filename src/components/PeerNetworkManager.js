import React, { useState } from 'react';
import usePeerNetwork from '../hooks/usePeerNetwork';

/**
 * Component for managing peer network connections
 */
const PeerNetworkManager = () => {
    const [targetPeerId, setTargetPeerId] = useState('');
    const { peerId, isReady, connectedPeers, connectToPeer } = usePeerNetwork();

    const handleConnect = (e) => {
        e.preventDefault();
        if (targetPeerId.trim()) {
            connectToPeer(targetPeerId.trim());
            setTargetPeerId('');
        }
    };

    return (
        <div className="peer-network-manager">
            <h2>Peer Network</h2>
            <div>
                <p>Your Peer ID: {peerId || 'Initializing...'}</p>
                <p>Network Status: {isReady ? 'Ready' : 'Initializing...'}</p>
            </div>

            <form onSubmit={handleConnect}>
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

            <div>
                <h3>Connected Peers ({connectedPeers.length})</h3>
                <ul>
                    {connectedPeers.map((peer) => (
                        <li key={peer}>{peer}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default PeerNetworkManager; 