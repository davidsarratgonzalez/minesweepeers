import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import './ChatRoom.css';

/**
 * Component for the chat room interface
 */
const ChatRoom = ({ messages, sendMessage, connectedUsers, currentUser }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const hasPeers = connectedUsers.size > 0;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="chat-room">
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <ChatMessage 
                        key={index} 
                        message={msg} 
                        connectedUsers={connectedUsers}
                        currentUser={currentUser}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="message-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={hasPeers ? "Type a message..." : "Connect to peers to chat"}
                    disabled={!hasPeers}
                />
                <button type="submit" disabled={!hasPeers}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatRoom; 