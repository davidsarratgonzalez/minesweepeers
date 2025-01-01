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

    const handleCopyPeerId = () => {
        navigator.clipboard.writeText(peerId);
    };

    const getUserName = (peerId) => {
        const user = connectedUsers.get(peerId);
        return user ? user.name : `Unknown (${peerId})`;
    };

    return (
        <div className="peer-network-manager">
            <div className="network-info">
                <div className="peer-id-container">
                    <div className="peer-id-wrapper">
                        <div className="peer-id">{peerId || 'Initializing...'}</div>
                    </div>
                    <button 
                        className="copy-button" 
                        onClick={handleCopyPeerId}
                        title="Copy Peer ID"
                    >
                        📋
                    </button>
                </div>

                <div className="connection-controls">
                    {connectedPeers.length === 0 ? (
                        <form className="connect-form" onSubmit={handleConnect}>
                            <input
                                type="text"
                                value={targetPeerId}
                                onChange={(e) => setTargetPeerId(e.target.value)}
                                placeholder="Enter peer ID to connect"
                                disabled={!isReady}
                            />
                            <button type="submit" disabled={!isReady}>
                                Connect
                            </button>
                        </form>
                    ) : (
                        <button 
                            className="disconnect-button"
                            onClick={handleDisconnect}
                        >
                            Disconnect All
                        </button>
                    )}
                </div>

                <div className="peers-list">
                    <h3>Connected Players ({connectedPeers.length + 1})</h3>
                    <ul>
                        <li 
                            className="current-user"
                            style={{ color: userInfo.color.value }}
                        >
                            {userInfo.name} (You)
                        </li>
                        {connectedPeers.map((peer) => (
                            <li 
                                key={peer}
                                style={{ color: connectedUsers.get(peer)?.color.value }}
                            >
                                {getUserName(peer)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="chat-container">
                <ChatRoom 
                    messages={messages} 
                    sendMessage={sendMessage}
                    connectedUsers={connectedUsers}
                    currentUser={userInfo}
                />
            </div>
        </div>
    );
};

export default PeerNetworkManager; 