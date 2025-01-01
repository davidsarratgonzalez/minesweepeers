import React from 'react';
import './ChatMessage.css';

/**
 * Component for rendering a single chat message
 */
const ChatMessage = ({ message, connectedUsers }) => {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const isSystem = message.type === 'SYSTEM';
    
    const userInfo = message.senderInfo || connectedUsers.get(message.sender);
    const userName = isSystem ? 'System' : (userInfo?.name || 'Unknown User');
    const userColor = userInfo?.color.value || '#999';

    return (
        <div className={`chat-message ${isSystem ? 'system' : 'user'}`}>
            {!isSystem && (
                <span className="sender" style={{ color: userColor }}>
                    {userName}:
                </span>
            )}
            <span className="content">{message.content}</span>
            <span className="timestamp">{timestamp}</span>
        </div>
    );
};

export default ChatMessage; 