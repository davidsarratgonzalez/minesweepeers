import React from 'react';
import './ChatMessage.css';

/**
 * ChatMessage Component - Renders a single chat message with appropriate styling
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.message - Message object containing content and metadata
 * @param {string} props.message.type - Type of message ('SYSTEM' or 'CHAT')
 * @param {string} props.message.content - The message text content
 * @param {string} props.message.sender - ID of the message sender
 * @param {Object} props.message.senderInfo - Optional sender information object
 * @param {Map} props.connectedUsers - Map of connected users and their information
 * @param {Object} props.currentUser - Current user's information
 * @returns {JSX.Element} Rendered chat message
 */
const ChatMessage = ({ message, connectedUsers, currentUser }) => {
    /**
     * Determines the style for system messages based on their content
     * 
     * @param {string} content - The message content to analyze
     * @returns {Object} Style object with background and text colors
     * - Green styling for 'joined' messages
     * - Red styling for 'left' messages
     * - Empty object for other system messages
     */
    const getSystemMessageStyle = (content) => {
        if (content.includes('joined') || content.includes('won')) {
            return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
        }
        if (content.includes('left') || content.includes('lost')) {
            return { backgroundColor: '#ffebee', color: '#c62828' };
        }
        return {};
    };

    // Handle system messages with special styling
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

    // Extract user information from either message metadata or connected users map
    const userInfo = message.senderInfo || connectedUsers.get(message.sender);
    const userName = userInfo?.name || 'Unknown User';
    const userColor = userInfo?.color.value || '#999';

    // Render regular chat message with sender's name and color
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