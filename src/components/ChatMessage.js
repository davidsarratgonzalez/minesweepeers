import React from 'react';
import './ChatMessage.css';

/**
 * Component for rendering a single chat message
 */
const ChatMessage = ({ message, connectedUsers, currentUser }) => {
    const getSystemMessageStyle = (content) => {
        if (content.includes('joined')) {
            return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
        }
        if (content.includes('left')) {
            return { backgroundColor: '#ffebee', color: '#c62828' };
        }
        return {};
    };

    if (message.type === 'SYSTEM') {
        return (
            <div 
                className="message system"
                style={getSystemMessageStyle(message.content)}
            >
                {message.content}
            </div>
        );
    }

    const userInfo = message.senderInfo || connectedUsers.get(message.sender);
    const userName = userInfo?.name || 'Unknown User';
    const userColor = userInfo?.color.value || '#999';

    return (
        <div className="message chat">
            <span className="message-content">
                <span className="sender" style={{ color: userColor }}>{userName}: </span>
                {message.content}
            </span>
        </div>
    );
};

export default ChatMessage; 