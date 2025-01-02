import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import './ChatRoom.css';
import NotificationTracker from '../services/NotificationTracker';

/**
 * ChatRoom Component - Provides a real-time chat interface with message history and user notifications
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.messages - Array of message objects to display
 * @param {Function} props.sendMessage - Callback to send a new message
 * @param {Map} props.connectedUsers - Map of currently connected users and their information
 * @param {Object} props.currentUser - Current user's information
 * @param {Function} props.addSystemMessage - Callback to add system notifications
 * @param {boolean} props.isEnabled - Whether the chat functionality is enabled
 * @returns {JSX.Element} Chat room interface with message history and input form
 */
const ChatRoom = ({ 
    messages, 
    sendMessage, 
    connectedUsers, 
    currentUser, 
    addSystemMessage,
    isEnabled 
}) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const notificationTracker = useRef(new NotificationTracker());

    /**
     * Scrolls the message container to the latest message
     * Uses smooth scrolling behavior for better user experience
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * Automatically scrolls to the latest message whenever messages are updated
     */
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    /**
     * Tracks and notifies when new users join the chat
     * Prevents duplicate notifications for the same user
     */
    useEffect(() => {
        const tracker = notificationTracker.current;

        connectedUsers.forEach((user, peerId) => {
            if (peerId !== currentUser.peerId && tracker.shouldNotifyJoin(peerId)) {
                addSystemMessage(`${user.name} joined!`);
            }
        });
    }, [connectedUsers, currentUser.peerId, addSystemMessage]);

    /**
     * Resets the notification tracker and message input when chat is disabled
     * Ensures clean state when reconnecting
     */
    useEffect(() => {
        if (!isEnabled) {
            notificationTracker.current.reset();
            setNewMessage('');
        }
    }, [isEnabled]);

    /**
     * Handles message submission
     * Trims whitespace and prevents empty messages from being sent
     * 
     * @param {React.FormEvent} e - Form submission event
     */
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
                    placeholder={isEnabled ? "Type a message..." : "Connect to peers to chat"}
                    disabled={!isEnabled}
                />
                <button type="submit" disabled={!isEnabled}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;