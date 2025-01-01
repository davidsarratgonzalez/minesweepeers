import React, { useState } from 'react';
import usePeerNetwork from '../hooks/usePeerNetwork';
import ChatRoom from './ChatRoom';
import './PeerNetworkManager.css';
import UserSetup from './UserSetup';

/**
 * Component for managing peer network connections and chat
 */
const PeerNetworkManager = () => {
    const [targetPeerId, setTargetPeerId] = useState('');
    const { 
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
    } = usePeerNetwork();

    if (!userInfo) {
        return <UserSetup onComplete={initializeWithUser} />;
    }

    const handleConnect = (e) => {
        e.preventDefault();
        if (targetPeerId.trim()) {
            connectToPeer(targetPeerId.trim());
            setTargetPeerId('');
        }
    };

    const handleDisconnect = () => {
        disconnectFromNetwork();
    };

    const getUserName = (peerId) => {
        const user = connectedUsers.get(peerId);
        return user ? user.name : `Unknown (${peerId})`;
    };

    return (
        <div className="peer-network-manager">
            <div className="network-info">
                <h2>Peer Network</h2>
                <div className="status-container">
                    <p>Your Name: <span className="user-name">{userInfo?.name}</span></p>
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
                    {connectedPeers.length > 0 && (
                        <button 
                            type="button" 
                            className="disconnect-button"
                            onClick={handleDisconnect}
                        >
                            Disconnect All
                        </button>
                    )}
                </form>

                <div className="peers-list">
                    <h3>Connected Peers ({connectedPeers.length})</h3>
                    <ul>
                        {connectedPeers.map((peer) => (
                            <li key={peer} style={{ 
                                color: connectedUsers.get(peer)?.color.value 
                            }}>
                                {getUserName(peer)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <ChatRoom 
                messages={messages} 
                sendMessage={sendMessage}
                connectedUsers={connectedUsers}
                currentUser={userInfo}
            />
        </div>
    );
};

export default PeerNetworkManager; 