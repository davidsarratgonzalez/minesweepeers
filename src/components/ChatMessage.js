import React from 'react';
import './ChatMessage.css';

/**
 * Component for rendering a single chat message
 */
const ChatMessage = ({ message }) => {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const isSystem = message.type === 'SYSTEM';

    return (
        <div className={`chat-message ${isSystem ? 'system' : 'user'}`}>
            {!isSystem && <span className="sender">{message.sender}: </span>}
            <span className="content">{message.content}</span>
            <span className="timestamp">{timestamp}</span>
        </div>
    );
};

export default ChatMessage; 